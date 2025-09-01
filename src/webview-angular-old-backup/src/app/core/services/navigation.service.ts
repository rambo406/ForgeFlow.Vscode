import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService, MessageType, WebviewMessage } from './message.service';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private router = inject(Router);
  private messageService = inject(MessageService);

  constructor() {
    // Listen for NAVIGATE messages from extension host
    this.messageService.onMessageOfType<{ path?: string }>(MessageType.NAVIGATE)
      .subscribe((msg: WebviewMessage<{ path?: string }>) => {
        const path = (msg.payload && (msg.payload as { path?: string }).path) || '/dashboard';
        // Normalize and navigate
        const target = path.startsWith('/') ? path : `/${path}`;
        this.router.navigateByUrl(target).catch(err => console.error('Navigation failed:', err));
      });
  }
}

