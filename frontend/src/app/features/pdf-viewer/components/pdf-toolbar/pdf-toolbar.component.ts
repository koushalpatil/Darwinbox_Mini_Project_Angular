import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';

export const TOOLBAR_HEIGHT = 48;

@Component({
  selector: 'app-pdf-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pdf-toolbar.component.html',
  styleUrl: './pdf-toolbar.component.css',
})
export class PdfToolbarComponent implements OnInit, OnDestroy {
  @Input() zoom = 100;
  @Input() fileName = 'document.pdf';
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() resetZoom = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
  @Output() print = new EventEmitter<void>();

  toolbarHeight = TOOLBAR_HEIGHT;
  isFullscreen = false;

  private fsChangeHandler = () => {
    this.isFullscreen = !!document.fullscreenElement;
  };

  ngOnInit(): void {
    document.addEventListener('fullscreenchange', this.fsChangeHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.fsChangeHandler);
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }
}
