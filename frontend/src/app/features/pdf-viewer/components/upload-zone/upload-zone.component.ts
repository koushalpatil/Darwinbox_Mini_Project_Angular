import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { UploadStage } from '../../../../core/models/pdf.models';

interface Stage {
  key: string;
  label: string;
  iconPath: string;
}

const STAGES: Stage[] = [
  {
    key: 'uploading_to_s3',
    label: 'Uploading to S3',
    iconPath: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 12v9m-4-4 4-4 4 4',
  },
  {
    key: 'retrieving_from_s3',
    label: 'Retrieving PDF from S3',
    iconPath: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3',
  },
  {
    key: 'extracting_fields',
    label: 'Extracting fields',
    iconPath:
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  },
  {
    key: 'completed',
    label: 'Completed',
    iconPath:
      'M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3zM5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z',
  },
];

@Component({
  selector: 'app-upload-zone',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './upload-zone.component.html',
  styleUrl: './upload-zone.component.css',
})
export class UploadZoneComponent {
  @Input() maxSizeMB = 10;
  @Input() currentStage: UploadStage = null;
  @Input() uploadProgress = 0;
  @Output() clickEvent = new EventEmitter<void>();
  @Output() dropEvent = new EventEmitter<File>();

  stages = STAGES;
  isDragOver = false;

  get isActive(): boolean {
    return this.currentStage !== null;
  }

  get currentIndex(): number {
    return STAGES.findIndex((s) => s.key === this.currentStage);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) {
      this.dropEvent.emit(file);
    }
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  onDragEnter(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
  }
}
