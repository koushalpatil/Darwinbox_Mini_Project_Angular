import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Reusable loading spinner with gradient animation.
 * Accepts a custom message to display below the spinner.
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner-container">
      <div class="spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring spinner-ring--inner"></div>
      </div>
      @if (message) {
        <p class="spinner-message">{{ message }}</p>
      }
    </div>
  `,
  styles: [`
    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-md);
    }

    .spinner {
      position: relative;
      width: 48px;
      height: 48px;
    }

    .spinner-ring {
      position: absolute;
      inset: 0;
      border: 3px solid rgba(255, 255, 255, 0.06);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spinnerRotate 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }

    .spinner-ring--inner {
      inset: 6px;
      border-top-color: var(--color-accent, #a78bfa);
      animation-duration: 1.5s;
      animation-direction: reverse;
    }

    .spinner-message {
      margin: 0;
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.02em;
    }

    @keyframes spinnerRotate {
      to { transform: rotate(360deg); }
    }
  `],
})
export class LoadingSpinnerComponent {
  @Input() message = '';
}
