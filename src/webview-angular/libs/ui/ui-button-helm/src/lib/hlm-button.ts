import { Directive, computed, input, signal } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';
import { hlm } from '@spartan-ng/brain/core';
import { type VariantProps, cva } from 'class-variance-authority';
import type { ClassValue } from 'clsx';
import { injectBrnButtonConfig } from './hlm-button.token';

export const buttonVariants = cva(
	'btn-vscode inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_ng-icon]:pointer-events-none shrink-0 [&_ng-icon]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-default',
	{
		variants: {
			variant: {
				default: 'bg-vscode-button-background text-vscode-button-foreground shadow-xs hover:bg-vscode-button-hoverBackground border border-vscode-button-border',
				destructive:
					'btn-vscode bg-vscode-error text-white shadow-xs hover:bg-vscode-error/90 focus-visible:ring-vscode-error/20 dark:focus-visible:ring-vscode-error/40',
				outline:
					'btn-vscode-secondary border border-vscode-panel-border bg-vscode-panel-background shadow-xs hover:bg-vscode-list-hoverBackground hover:text-vscode-foreground',
				secondary: 'btn-vscode-secondary bg-vscode-panel-background text-vscode-foreground shadow-xs hover:bg-vscode-list-hoverBackground border border-vscode-panel-border',
				ghost: 'bg-transparent hover:bg-vscode-list-hoverBackground hover:text-vscode-foreground border-transparent',
				link: 'text-vscode-link underline-offset-4 hover:underline bg-transparent border-transparent',
			},
			size: {
				default: 'h-9 px-4 py-2 has-[>ng-icon]:px-3',
				sm: 'h-8 rounded-md gap-1.5 px-3 has-[>ng-icon]:px-2.5',
				lg: 'h-10 rounded-md px-6 has-[>ng-icon]:px-4',
				icon: 'size-9',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

@Directive({
	selector: 'button[hlmBtn], a[hlmBtn]',
	exportAs: 'hlmBtn',
	hostDirectives: [{ directive: BrnButton, inputs: ['disabled'] }],
	host: {
		'[class]': '_computedClass()',
	},
})
export class HlmButton {
	private readonly _config = injectBrnButtonConfig();

	private readonly _additionalClasses = signal<ClassValue>('');

	public readonly userClass = input<ClassValue>('', { alias: 'class' });

	protected readonly _computedClass = computed(() =>
		hlm(buttonVariants({ variant: this.variant(), size: this.size() }), this.userClass(), this._additionalClasses()),
	);

	public readonly variant = input<ButtonVariants['variant']>(this._config.variant);

	public readonly size = input<ButtonVariants['size']>(this._config.size);

	setClass(classes: string): void {
		this._additionalClasses.set(classes);
	}
}
