import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * App header with branding and glassmorphism styling.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {}
