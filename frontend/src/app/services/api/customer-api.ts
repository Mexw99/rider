import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { Customer } from '../../model/customer.model';

type CustomerUpdate = Partial<
  Pick<
    Customer,
    | 'first_name'
    | 'last_name'
    | 'phone'
    | 'address'
    | 'latitude'
    | 'longitude'
  >
>;

interface DeleteCustomerResponse {
  message: string;
  customer_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerApi {
  private readonly http = inject(HttpClient);
  private readonly api = inject(Api);

  async getCustomers(): Promise<Customer[]> {
    const url = `${this.api.API_ENDPOINT}/customers`;
    return await lastValueFrom(this.http.get<Customer[]>(url));
  }

  async updateCustomer(
    customerId: number,
    changes: CustomerUpdate,
  ): Promise<Customer> {
    const url = `${this.api.API_ENDPOINT}/customers/${customerId}`;
    return await lastValueFrom(this.http.patch<Customer>(url, changes));
  }

  async deleteCustomer(
    customerId: number,
  ): Promise<DeleteCustomerResponse> {
    const url = `${this.api.API_ENDPOINT}/customers/${customerId}`;
    return await lastValueFrom(
      this.http.delete<DeleteCustomerResponse>(url),
    );
  }
}