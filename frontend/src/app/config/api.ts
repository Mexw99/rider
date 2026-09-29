import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Api {
  public readonly API_ENDPOINT = 'http://localhost:3000';
}
