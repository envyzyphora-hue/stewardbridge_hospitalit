"use client";

import { COUNTRIES, NIGERIA_STATES, countryFlag } from "@/lib/geo";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type LocationValue = {
  country: string;
  region: string;
  city: string;
};

export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}) {
  const countryOptions = COUNTRIES.map((c) => ({
    value: c.name,
    label: c.name,
    prefix: countryFlag(c.code),
  }));

  const isNigeria = value.country === "Nigeria";
  const stateOptions = Object.keys(NIGERIA_STATES).map((s) => ({ value: s, label: s }));
  const lgaOptions = isNigeria && value.region ? (NIGERIA_STATES[value.region] ?? []).map((l) => ({ value: l, label: l })) : [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SearchableSelect
        label="Country"
        placeholder="Select country"
        searchPlaceholder="Search countries…"
        options={countryOptions}
        value={value.country}
        onChange={(country) => onChange({ country, region: "", city: "" })}
      />

      {isNigeria ? (
        <SearchableSelect
          label="State"
          placeholder="Select state"
          searchPlaceholder="Search states…"
          options={stateOptions}
          value={value.region}
          disabled={!value.country}
          onChange={(region) => onChange({ ...value, region, city: "" })}
        />
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-brand-800">State / Province / Region</label>
          <input
            type="text"
            disabled={!value.country}
            value={value.region}
            onChange={(e) => onChange({ ...value, region: e.target.value })}
            placeholder="e.g. Ontario, Texas, Greater London"
            className="h-11 w-full rounded-xl border border-brand-200 bg-white px-3.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-brand-50 disabled:text-brand-400"
          />
        </div>
      )}

      {isNigeria ? (
        <SearchableSelect
          label="LGA / Area"
          placeholder="Select LGA / area"
          searchPlaceholder="Search areas…"
          options={lgaOptions}
          value={value.city}
          disabled={!value.region}
          onChange={(city) => onChange({ ...value, city })}
        />
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-brand-800">City / Town / Area</label>
          <input
            type="text"
            disabled={!value.country}
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="e.g. Toronto, Houston, Manchester"
            className="h-11 w-full rounded-xl border border-brand-200 bg-white px-3.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-brand-50 disabled:text-brand-400"
          />
        </div>
      )}
    </div>
  );
}
