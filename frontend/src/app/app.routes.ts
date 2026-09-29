import { Routes } from '@angular/router';
import { Customers } from './pages/customers/customers';
import { Orders } from './pages/orders/orders';
import { DeliveryRoutes } from './pages/delivery-routes/delivery-routes';

export const routes: Routes = [
  { path: '', redirectTo: 'customers', pathMatch: 'full' },
  { path: 'customers', component: Customers },
  { path: 'orders', component: Orders },
  { path: 'delivery-routes', component: DeliveryRoutes },
];
