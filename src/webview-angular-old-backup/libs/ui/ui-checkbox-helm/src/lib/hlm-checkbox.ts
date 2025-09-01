import { BooleanInput } from '@angular/cdk/coercion';
import {
	ChangeDetectionStrategy,
	Component,
	booleanAttribute,
	computed,
	effect,
	forwardRef,
	input,
	model,
	output,
	signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { BrnCheckbox } from '@spartan-ng/brain/checkbox';
import type { ChangeFn, TouchFn } from '@spartan-ng/brain/forms';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';

export const HLM_CHECKBOX_VALUE_ACCESSOR = {
	provide: NG_VALUE_ACCESSOR,
	useExisting: forwardRef(() => HlmCheckbox),
	multi: true,
};

@Component({
	selector: 'hlm-checkbox',
	imports: [BrnCheckbox, NgIcon, HlmIcon],
	template: `
		<brn-checkbox
			[attr.id]="$any(idValue)"
			[attr.name]="$any(nameValue)"
			[attr.aria-label]="$any(ariaLabelValue)"
			[attr.aria-labelledby]="$any(ariaLabelledbyValue)"
			[attr.aria-describedby]="$any(ariaDescribedbyValue)"
			[attr.class]="$any(computedClassValue)"
			[checked]="$any(checkedValue)"
			[disabled]="$any(stateDisabled)"
			[required]="$any(requiredValue)"
			(changed)="_handleChange()"
			(touched)="_invokeTouched()"
		>
			@if (checkedValue) {
				<span class="flex items-center justify-center text-current transition-none">
					<ng-icon hlm size="14px" name="lucideCheck" />
				</span>
			}
		</brn-checkbox>
	`,
	host: {
		class: 'contents peer',
		'[attr.id]': 'null',
		'[attr.aria-label]': 'null',
		'[attr.aria-labelledby]': 'null',
		'[attr.aria-describedby]': 'null',
		'[attr.data-disabled]': '_state().disabled() ? "" : null',
	},
	providers: [HLM_CHECKBOX_VALUE_ACCESSOR],
	viewProviders: [provideIcons({ lucideCheck })],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HlmCheckbox implements ControlValueAccessor {
	public readonly userClass = input<ClassValue>('', { alias: 'class' });

	// Template-friendly primitive snapshots to avoid union signal types in template binding
	public idValue: string | null = null;
	public nameValue: string | null = null;
	public computedClassValue: string = '';
	public checkedValue: boolean | 'indeterminate' = false;
	public stateDisabled: boolean = false;
	public requiredValue: boolean = false;
	public ariaLabelValue: string | null = null;
	public ariaLabelledbyValue: string | null = null;
	public ariaDescribedbyValue: string | null = null;

	protected readonly _computedClass = computed(() =>
		hlm(
			'peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 cursor-default',
			this.userClass(),
			this._state().disabled() ? 'cursor-not-allowed opacity-50' : '',
		),
	);

	/** Used to set the id on the underlying brn element. */
	public readonly id = input<string | null>(null);

	/** Used to set the aria-label attribute on the underlying brn element. */
	public readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });

	/** Used to set the aria-labelledby attribute on the underlying brn element. */
	public readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });

	/** Used to set the aria-describedby attribute on the underlying brn element. */
	public readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

	/** The checked state of the checkbox. */
	public readonly checked = model<CheckboxValue>(false);

	/** The name attribute of the checkbox. */
	public readonly name = input<string | null>(null);

	/** Whether the checkbox is required. */
	public readonly required = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

	/** Whether the checkbox is disabled. */
	public readonly disabled = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

	protected readonly _state = computed(() => ({
		disabled: signal(this.disabled()),
	}));

	public readonly changed = output<boolean>();

	protected _onChange?: ChangeFn<CheckboxValue>;
	protected _onTouched?: TouchFn;

	constructor() {
		// Keep primitive snapshots in sync with signal-backed inputs
		effect(() => {
			try {
				this.idValue = (this.id as any)?.() ?? null;
			} catch (e) {
				this.idValue = null;
			}
			try {
				this.nameValue = (this.name as any)?.() ?? null;
			} catch (e) {
				this.nameValue = null;
			}
			try {
				this.computedClassValue = String((this._computedClass as any)?.());
			} catch (e) {
				this.computedClassValue = '';
			}
			try {
				this.checkedValue = (this.checked as any)?.();
			} catch (e) {
				this.checkedValue = false;
			}
			try {
				this.stateDisabled = Boolean((this._state as any)?.().disabled?.());
			} catch (e) {
				this.stateDisabled = false;
			}
			try {
				this.requiredValue = Boolean((this.required as any)?.());
			} catch (e) {
				this.requiredValue = false;
			}
			try {
				this.ariaLabelValue = (this.ariaLabel as any)?.() ?? null;
			} catch (e) {
				this.ariaLabelValue = null;
			}
			try {
				this.ariaLabelledbyValue = (this.ariaLabelledby as any)?.() ?? null;
			} catch (e) {
				this.ariaLabelledbyValue = null;
			}
			try {
				this.ariaDescribedbyValue = (this.ariaDescribedby as any)?.() ?? null;
			} catch (e) {
				this.ariaDescribedbyValue = null;
			}
		});
	}

	// Safe wrapper to invoke touched callback (used from template)
	protected _invokeTouched(): void {
		try {
			this._onTouched?.();
		} catch (e) {
			// swallow errors from touched callback
		}
	}

	protected _handleChange(): void {
		if (this._state().disabled()) return;

		const previousChecked = this.checked();
		this.checked.set(previousChecked === 'indeterminate' ? true : !previousChecked);
		this._onChange?.(!previousChecked);
		this.changed.emit(!previousChecked);
	}

	/** CONTROL VALUE ACCESSOR */
	writeValue(value: CheckboxValue): void {
		this.checked.set(!!value);
	}

	registerOnChange(fn: ChangeFn<CheckboxValue>): void {
		this._onChange = fn;
	}

	registerOnTouched(fn: TouchFn): void {
		this._onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		this._state().disabled.set(isDisabled);
	}
}

type CheckboxValue = boolean | 'indeterminate';
