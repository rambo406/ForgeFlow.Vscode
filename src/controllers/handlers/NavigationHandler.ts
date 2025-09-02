import { MessageHandler, HandlerContext } from './MessageHandler';
import { MessageType, WebviewMessage, DashboardView } from '../Messages';

export class NavigationHandler implements MessageHandler {
    private readonly types = new Set<MessageType>([
        MessageType.UPDATE_VIEW
    ]);

    canHandle(type: MessageType): boolean {
        return this.types.has(type);
    }

    async handle(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        switch (message.type) {
            case MessageType.UPDATE_VIEW:
                return this.handleUpdateView(message, ctx);
            default:
                return;
        }
    }

    private async handleUpdateView(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        ctx.currentView = message.payload?.view || DashboardView.PULL_REQUEST_LIST;
        if (!message.requestId) {
            ctx.sendMessage({ type: MessageType.UPDATE_VIEW, payload: { view: ctx.currentView } });
        }
    }
}

