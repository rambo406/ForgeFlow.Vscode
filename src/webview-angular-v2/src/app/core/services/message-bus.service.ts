/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { VsCodeApiService } from './vscode-api.service';
import { MessageType, WebviewMessage } from '../models/messages';

@Injectable({ providedIn: 'root' })
export class MessageBusService {
    private readonly incoming$ = new Subject<WebviewMessage<any>>();

    constructor(private readonly vscode: VsCodeApiService, private readonly zone: NgZone) {
        // Wire up window message listener
        window.addEventListener('message', (event: MessageEvent) => {
            // Ensure changes run inside Angular since we are zoneless
            this.zone.run(() => {
                const data = event.data as WebviewMessage<any>;
                if (data && data.type) {
                    this.incoming$.next(data);
                }
            });
        });
    }

    onMessage() {
        return this.incoming$.asObservable();
    }

    post<T = any>(type: MessageType, payload?: T, requestId?: string): void {
        const message: WebviewMessage<T> = { type, payload, requestId };
        this.vscode.postMessage(message);
    }
}

