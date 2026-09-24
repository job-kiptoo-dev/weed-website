"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { US_STATES } from "@/lib/validation/address.schema";

/** The address fields the checkout collects, as raw form strings. */
export interface CheckoutAddressValues {
  firstName: string;
  lastName: string;
  company: string;
  country: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
}

export type CheckoutAddressField = keyof CheckoutAddressValues;

export type CheckoutAddressErrors = Partial<
  Record<CheckoutAddressField, string>
>;

export const EMPTY_ADDRESS_VALUES: CheckoutAddressValues = {
  firstName: "",
  lastName: "",
  company: "",
  country: "US",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  phone: "",
};

/** Every address field, for mapping dotted error keys back onto the inputs. */
export const ADDRESS_FIELDS = Object.keys(
  EMPTY_ADDRESS_VALUES,
) as CheckoutAddressField[];

/** Billing and shipping share the markup; the prefix keeps them apart. */
export type AddressPrefix = "billing" | "shipping";

interface BillingDetailsFormProps {
  /**
   * Namespaces every input id (`billing-first-name`) and seeds the browser's
   * autofill section token, so the two address blocks never collide.
   */
  prefix: AddressPrefix;
  values: CheckoutAddressValues;
  errors: CheckoutAddressErrors;
  onChange: (field: CheckoutAddressField, value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The address block, reused verbatim for the separate delivery address. It
 * owns no state: the checkout island holds the values so one submit can send
 * both addresses together.
 */
export function BillingDetailsForm({
  prefix,
  values,
  errors,
  onChange,
  disabled = false,
  className,
}: BillingDetailsFormProps) {
  const id = (field: string) => `${prefix}-${field}`;
  const autoComplete = (token: string) => `${prefix} ${token}`;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id={id("first-name")}
          label="First name"
          autoComplete={autoComplete("given-name")}
          required
          disabled={disabled}
          value={values.firstName}
          error={errors.firstName}
          onChange={(event) => onChange("firstName", event.target.value)}
        />
        <Input
          id={id("last-name")}
          label="Last name"
          autoComplete={autoComplete("family-name")}
          required
          disabled={disabled}
          value={values.lastName}
          error={errors.lastName}
          onChange={(event) => onChange("lastName", event.target.value)}
        />
      </div>
      <Input
        id={id("company")}
        label="Company name (optional)"
        autoComplete={autoComplete("organization")}
        disabled={disabled}
        value={values.company}
        error={errors.company}
        onChange={(event) => onChange("company", event.target.value)}
      />
      {/* US-only: the shop ships nowhere else, so there is one option. */}
      <Select
        id={id("country")}
        label="Country / Region"
        autoComplete={autoComplete("country")}
        required
        disabled={disabled}
        value={values.country}
        error={errors.country}
        onChange={(event) => onChange("country", event.target.value)}
      >
        <option value="US">United States (US)</option>
      </Select>
      <Input
        id={id("line1")}
        label="Street address"
        hint="House number and street name"
        autoComplete={autoComplete("address-line1")}
        required
        disabled={disabled}
        value={values.line1}
        error={errors.line1}
        onChange={(event) => onChange("line1", event.target.value)}
      />
      <Input
        id={id("line2")}
        label="Apartment, suite, unit, etc. (optional)"
        autoComplete={autoComplete("address-line2")}
        disabled={disabled}
        value={values.line2}
        error={errors.line2}
        onChange={(event) => onChange("line2", event.target.value)}
      />
      <Input
        id={id("city")}
        label="Town / City"
        autoComplete={autoComplete("address-level2")}
        required
        disabled={disabled}
        value={values.city}
        error={errors.city}
        onChange={(event) => onChange("city", event.target.value)}
      />
      <Select
        id={id("state")}
        label="State"
        autoComplete={autoComplete("address-level1")}
        required
        disabled={disabled}
        value={values.state}
        error={errors.state}
        onChange={(event) => onChange("state", event.target.value)}
      >
        <option value="">Choose a state</option>
        {US_STATES.map((state) => (
          <option key={state.code} value={state.code}>
            {state.name}
          </option>
        ))}
      </Select>
      <Input
        id={id("postal-code")}
        label="ZIP Code"
        inputMode="numeric"
        autoComplete={autoComplete("postal-code")}
        required
        disabled={disabled}
        value={values.postalCode}
        error={errors.postalCode}
        onChange={(event) => onChange("postalCode", event.target.value)}
      />
      {/* Required here (unlike the account address book): every payment
          method ends with a person calling or texting the customer. */}
      <Input
        id={id("phone")}
        label="Phone"
        type="tel"
        autoComplete={autoComplete("tel")}
        required
        disabled={disabled}
        value={values.phone}
        error={errors.phone}
        onChange={(event) => onChange("phone", event.target.value)}
      />
    </div>
  );
}
