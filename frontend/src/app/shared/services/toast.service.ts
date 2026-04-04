import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);

  readonly toasts$ = this.toastsSubject.asObservable();

  private show(type: ToastMessage['type'], message: string, duration = 5000): void {
    const id = ++this.counter;
    const toast: ToastMessage = { id, type, message };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    setTimeout(() => this.remove(id), duration);
  }

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message, 6000);
  }

  info(message: string): void {
    this.show('info', message);
  }

  warning(message: string): void {
    this.show('warning', message);
  }

  remove(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((t) => t.id !== id));
  }
}
