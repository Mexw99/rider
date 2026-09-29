import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { MAPTILER_API_KEY } from '../../config/map';
import { Customer } from '../../model/customer.model';
import { CustomerApi } from '../../services/api/customer-api';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-customers',
  imports: [FormsModule],
  templateUrl: './customers.html',
  styleUrl: './customers.css',
})
export class Customers implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapElement') private mapElement!: ElementRef<HTMLDivElement>;

  private readonly customerApi = inject(CustomerApi);
  private map?: L.Map;
  private customerMarkerLayer?: L.LayerGroup;
  private readonly customerMarkers = new Map<number, L.Marker>();

  protected readonly customers = signal<Customer[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly notification = signal<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  protected readonly deletingCustomerId = signal<number | null>(null);
  protected readonly editingCustomer = signal<Customer | null>(null);
  protected readonly pickingLocation = signal(false);

  protected editForm = {
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
  };

  ngOnInit(): void {
    this.loadCustomers();
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement.nativeElement).setView([16.244335, 103.249455], 14);

    L.tileLayer(
      `https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
      {
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 1,
        attribution:
          '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        crossOrigin: true,
      },
    ).addTo(this.map);

    this.customerMarkerLayer = L.layerGroup().addTo(this.map);
    this.renderCustomerMarkers();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private renderCustomerMarkers(): void {
    if (!this.map || !this.customerMarkerLayer) {
      return;
    }

    this.customerMarkerLayer.clearLayers();
    this.customerMarkers.clear();

    const positions: L.LatLngTuple[] = [];

    const customerIcon = L.divIcon({
      className: 'customer-pin',
      html: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
          <path
            d="M16 41S2 24.6 2 16a14 14 0 1 1 28 0c0 8.6-14 25-14 25Z"
            fill="#2563eb"
            stroke="white"
            stroke-width="2"
          />
          <circle cx="16" cy="16" r="5" fill="white" />
        </svg>
      `,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -40],
    });

    for (const customer of this.customers()) {
      const latitude = Number(customer.latitude);
      const longitude = Number(customer.longitude);

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        continue;
      }

      const popup = document.createElement('div');

      const name = document.createElement('strong');
      name.textContent = `${customer.first_name} ${customer.last_name}`;

      const phone = document.createElement('p');
      phone.textContent = `เบอร์โทร: ${customer.phone}`;

      const address = document.createElement('p');
      address.textContent = `ที่อยู่: ${customer.address}`;

      popup.append(name, phone, address);

      const marker = L.marker([latitude, longitude], { icon: customerIcon })
        .bindPopup(popup)
        .addTo(this.customerMarkerLayer);

      this.customerMarkers.set(customer.customer_id, marker);
      positions.push([latitude, longitude]);
    }

    if (positions.length === 1) {
      this.map.setView(positions[0], 14);
    } else if (positions.length > 1) {
      this.map.fitBounds(positions, { padding: [24, 24], maxZoom: 14 });
    }
  }

  protected focusCustomer(customer: Customer): void {
    const marker = this.customerMarkers.get(customer.customer_id);

    if (!this.map || !marker) {
      return;
    }

    this.map.flyTo(marker.getLatLng(), Math.max(this.map.getZoom(), 16), {
      duration: 0.6,
    });

    marker.openPopup();
  }

  private async loadCustomers(): Promise<void> {
    try {
      const customers = await this.customerApi.getCustomers();
      this.customers.set(customers);
      this.renderCustomerMarkers();
    } catch (error) {
      console.error('ไม่สามารถโหลดข้อมูลลูกค้าได้:', error);
      this.errorMessage.set('ไม่สามารถโหลดข้อมูลลูกค้าได้');
    } finally {
      this.loading.set(false);
    }
  }

  protected async deleteCustomer(customer: Customer): Promise<void> {
    const fullName = `${customer.first_name} ${customer.last_name}`;

    const confirmed = window.confirm(
      `ยืนยันลบข้อมูลลูกค้า ${fullName} ใช่ไหม?\nการลบนี้ไม่สามารถย้อนกลับได้`,
    );

    if (!confirmed) {
      return;
    }

    this.notification.set(null);
    this.deletingCustomerId.set(customer.customer_id);

    try {
      const result = await this.customerApi.deleteCustomer(customer.customer_id);

      this.customers.update((customers) =>
        customers.filter((item) => item.customer_id !== customer.customer_id),
      );

      this.renderCustomerMarkers();
      this.notification.set({
        type: 'success',
        message: `${result.message}: ${fullName}`,
      });
    } catch (error) {
      console.error('ไม่สามารถลบข้อมูลลูกค้าได้:', error);

      let message = 'ลบข้อมูลลูกค้าไม่สำเร็จ กรุณาลองใหม่';

      if (error instanceof HttpErrorResponse) {
        if (error.status === 409) {
          message = `ลบ "${fullName}" ไม่ได้ เพราะลูกค้าคนนี้มีรายการสั่งซื้ออยู่`;
        } else if (error.status === 404) {
          message = `ไม่พบข้อมูลลูกค้า "${fullName}" อาจถูกลบไปแล้ว`;
        } else if (error.status === 0) {
          message = 'ติดต่อ Backend ไม่ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงาน';
        } else if (
          typeof error.error?.message === 'string' &&
          error.error.message !== 'ไม่สามารถลบข้อมูลลูกค้าได้'
        ) {
          message = error.error.message;
        } else {
          message = `Backend เกิดข้อผิดพลาด (HTTP ${error.status}) กรุณาตรวจสอบ log ของ Backend`;
        }
      }

      this.notification.set({ type: 'error', message });
    } finally {
      this.deletingCustomerId.set(null);
    }
  }

  protected startEditing(customer: Customer): void {
    this.editingCustomer.set(customer);

    this.editForm = {
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      address: customer.address,
      latitude: customer.latitude,
      longitude: customer.longitude,
    };

    this.pickingLocation.set(false);
    this.notification.set(null);
    this.focusCustomer(customer);
  }

  protected cancelEditing(): void {
    this.editingCustomer.set(null);
    this.pickingLocation.set(false);
  }
}
