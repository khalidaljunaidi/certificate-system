"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";

import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { submitVendorRegistrationAction } from "@/actions/vendor-registration-actions";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { VendorRegistrationFormOptions } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Company Information",
    subtitle:
      "Capture the vendor's identity, contact details, legal identifiers, and the master registration baseline.",
  },
  {
    title: "Address Information",
    subtitle:
      "Define the operational location coverage and structured address details for the registration record.",
  },
  {
    title: "Business Information",
    subtitle:
      "Record business background, years in operation, and the overall commercial footprint.",
  },
  {
    title: "Products / Services",
    subtitle:
      "Choose the primary taxonomy and supporting subcategories, then describe the products or services offered.",
  },
  {
    title: "References",
    subtitle:
      "Provide three references so procurement can validate the supplier before approval.",
  },
  {
    title: "Bank Information",
    subtitle:
      "Record the banking details required for the approval review and payment readiness checks.",
  },
  {
    title: "Additional Information",
    subtitle:
      "Upload the core supporting documents and add any extra notes that may help the review team.",
  },
  {
    title: "Declaration",
    subtitle:
      "Confirm the application details and complete the final declaration before submission.",
  },
] as const;

const COVERAGE_SCOPE_OPTIONS = [
  { value: "SPECIFIC_CITIES", label: "Specific cities" },
  { value: "ALL_COUNTRY", label: "All cities in selected country" },
  { value: "GCC", label: "GCC coverage" },
  { value: "MENA", label: "MENA coverage" },
  { value: "EU", label: "EU coverage" },
  { value: "GLOBAL", label: "Global coverage" },
] as const;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const ALLOWED_UPLOAD_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

const ATTACHMENT_FIELDS = [
  {
    name: "crAttachment",
    label: "CR",
    helper: "Commercial registration document.",
    required: true,
  },
  {
    name: "vatAttachment",
    label: "VAT",
    helper: "VAT certificate or tax registration document.",
    required: true,
  },
  {
    name: "companyProfileAttachment",
    label: "Company Profile",
    helper: "Profile, brochure, or capability deck.",
    required: true,
  },
  {
    name: "financialsAttachment",
    label: "Financials",
    helper: "Financial statements or bank-ready financial documents.",
    required: false,
  },
  {
    name: "bankCertificateAttachment",
    label: "Bank Certificate",
    helper: "Bank certificate or account confirmation letter.",
    required: false,
  },
] as const;

type AttachmentFieldName = (typeof ATTACHMENT_FIELDS)[number]["name"];
type SelectedUploadFiles = Partial<Record<AttachmentFieldName, File>>;
type UploadFieldErrors = Partial<Record<AttachmentFieldName, string>>;

type VendorRegistrationFormProps = {
  options: VendorRegistrationFormOptions;
};

type CoverageScope = (typeof COVERAGE_SCOPE_OPTIONS)[number]["value"];

function getCoverageCityIds(input: {
  countries: VendorRegistrationFormOptions["countries"];
  countryCode: string;
  coverageScope: CoverageScope;
}) {
  const selectedCountry = input.countries.find(
    (country) => country.code === input.countryCode,
  );

  if (!selectedCountry) {
    return [];
  }

  if (input.coverageScope === "SPECIFIC_CITIES") {
    return [];
  }

  if (input.coverageScope === "ALL_COUNTRY") {
    return selectedCountry.cities.map((city) => city.id);
  }

  if (input.coverageScope === "GLOBAL") {
    return input.countries.flatMap((country) =>
      country.cities.map((city) => city.id),
    );
  }

  return input.countries
    .filter((country) => country.regionGroup === input.coverageScope)
    .flatMap((country) => country.cities.map((city) => city.id));
}

function formatCoverageLabel(
  scope: CoverageScope,
  countryName?: string,
  countryCode?: string,
) {
  if (scope === "ALL_COUNTRY") {
    return countryCode === "SA" ? "All Saudi cities" : `All cities in ${countryName ?? "selected country"}`;
  }

  return (
    COVERAGE_SCOPE_OPTIONS.find((option) => option.value === scope)?.label ??
    "Coverage"
  );
}

function StepPill({
  index,
  title,
  active,
  onClick,
}: {
  index: number;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors",
        active
          ? "border-[var(--color-primary)] bg-[rgba(49,19,71,0.08)] text-[var(--color-primary)]"
          : "border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
      )}
    >
      {index + 1}. {title}
    </button>
  );
}

function SectionPanel({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div hidden={!active} className={cn(!active && "hidden")}>
      {children}
    </div>
  );
}

function ReferenceGroup({
  index,
  isPending,
}: {
  index: 1 | 2 | 3;
  isPending: boolean;
}) {
  return (
    <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel-soft)]">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            Reference {index}
          </p>
          <Badge variant="purple">Required</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={`reference${index}Name`}>
              Contact Name <span className="text-[#991b1b]">*</span>
            </Label>
            <Input
              id={`reference${index}Name`}
              name={`reference${index}Name`}
              required
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor={`reference${index}CompanyName`}>
              Company Name <span className="text-[#991b1b]">*</span>
            </Label>
            <Input
              id={`reference${index}CompanyName`}
              name={`reference${index}CompanyName`}
              required
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor={`reference${index}Email`}>
              Email <span className="text-[#991b1b]">*</span>
            </Label>
            <Input
              id={`reference${index}Email`}
              name={`reference${index}Email`}
              type="email"
              required
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor={`reference${index}Phone`}>
              Phone <span className="text-[#991b1b]">*</span>
            </Label>
            <Input
              id={`reference${index}Phone`}
              name={`reference${index}Phone`}
              required
              disabled={isPending}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor={`reference${index}Title`}>
              Title <span className="text-[#991b1b]">*</span>
            </Label>
            <Input
              id={`reference${index}Title`}
              name={`reference${index}Title`}
              required
              disabled={isPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AttachmentField({
  name,
  label,
  helper,
  required,
  isPending,
  selectedFile,
  error,
  onFileChange,
}: {
  name: AttachmentFieldName;
  label: string;
  helper: string;
  required: boolean;
  isPending: boolean;
  selectedFile: File | null;
  error: string | null;
  onFileChange: (name: AttachmentFieldName, file: File | null) => void;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-[#991b1b]"> *</span> : null}
      </Label>
      <Input
        id={name}
        name={name}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        required={required}
        disabled={isPending}
        onChange={(event) =>
          onFileChange(name, event.currentTarget.files?.[0] ?? null)
        }
        className="mt-2 file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-panel-soft)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[var(--color-ink)]"
      />
      {selectedFile ? (
        <p className="mt-2 rounded-[14px] bg-[rgba(21,128,61,0.08)] px-3 py-2 text-xs font-medium text-[#166534]">
          Selected: {selectedFile.name}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-[14px] bg-[rgba(185,28,28,0.08)] px-3 py-2 text-xs font-medium text-[#991b1b]">
          {error}
        </p>
      ) : null}
      <p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">
        {helper} PDF, JPG, or PNG only. Max 10MB per file.
      </p>
    </div>
  );
}

function validateUploadFile(file: File, label: string) {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${label} must be 10MB or less.`;
  }

  if (!isAllowedUploadFile(file)) {
    return `${label} must be a PDF, JPG, or PNG file.`;
  }

  return null;
}

function isAllowedUploadFile(file: File) {
  const fileName = file.name.trim().toLowerCase();

  return (
    ALLOWED_UPLOAD_TYPES.has(file.type) ||
    ALLOWED_UPLOAD_EXTENSIONS.some((extension) => fileName.endsWith(extension))
  );
}

function validateUploadInputs(uploadFiles: SelectedUploadFiles) {
  let totalBytes = 0;
  const fieldErrors: UploadFieldErrors = {};

  for (const field of ATTACHMENT_FIELDS) {
    const file = uploadFiles[field.name] ?? null;

    if (!file) {
      if (field.required) {
        fieldErrors[field.name] = `${field.label} is required.`;
      }

      continue;
    }

    totalBytes += file.size;
    const fileError = validateUploadFile(file, field.label);

    if (fileError) {
      fieldErrors[field.name] = fileError;
    }
  }

  const firstFieldError = ATTACHMENT_FIELDS.map(
    (field) => fieldErrors[field.name],
  ).find(Boolean);

  if (firstFieldError) {
    return {
      message: firstFieldError,
      fieldErrors,
    };
  }

  if (totalBytes > MAX_UPLOAD_BYTES) {
    return {
      message:
        "The combined upload size must stay under 10MB for this submission. Please reduce file sizes and try again.",
      fieldErrors,
    };
  }

  return {
    message: null,
    fieldErrors,
  };
}

function appendControlToFormData(
  formData: FormData,
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) {
  if (!element.name || element.disabled) {
    return;
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === "file") {
      return;
    }

    if (element.type === "checkbox" || element.type === "radio") {
      if (element.checked) {
        formData.append(element.name, element.value || "on");
      }
      return;
    }

    formData.append(element.name, element.value);
    return;
  }

  if (element instanceof HTMLSelectElement && element.multiple) {
    for (const option of Array.from(element.selectedOptions)) {
      formData.append(element.name, option.value);
    }
    return;
  }

  formData.append(element.name, element.value);
}

function buildCompleteRegistrationFormData(
  form: HTMLFormElement,
  uploadFiles: SelectedUploadFiles,
) {
  const formData = new FormData();

  for (const element of Array.from(form.elements)) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      appendControlToFormData(formData, element);
    }
  }

  for (const field of ATTACHMENT_FIELDS) {
    const file = uploadFiles[field.name];

    formData.delete(field.name);

    if (file) {
      formData.set(field.name, file);
    }
  }

  return formData;
}

function firstFieldError(
  fieldErrors: Record<string, string[]> | undefined,
): string | null {
  if (!fieldErrors) {
    return null;
  }

  for (const messages of Object.values(fieldErrors)) {
    const message = messages?.[0];

    if (message) {
      return message;
    }
  }

  return null;
}

function getStepForField(fieldName: string) {
  if (
    [
      "companyName",
      "legalName",
      "companyEmail",
      "companyPhone",
      "website",
      "crNumber",
      "vatNumber",
    ].includes(fieldName)
  ) {
    return 0;
  }

  if (
    [
      "countryCode",
      "coverageScope",
      "cityIds",
      "addressLine1",
      "addressLine2",
      "district",
      "region",
      "postalCode",
      "poBox",
    ].includes(fieldName)
  ) {
    return 1;
  }

  if (
    ["businessDescription", "yearsInBusiness", "employeeCount"].includes(
      fieldName,
    )
  ) {
    return 2;
  }

  if (["categoryId", "subcategoryIds", "servicesOverview"].includes(fieldName)) {
    return 3;
  }

  if (fieldName.startsWith("reference")) {
    return 4;
  }

  if (
    ["bankName", "accountName", "iban", "swiftCode", "bankAccountNumber"].includes(
      fieldName,
    )
  ) {
    return 5;
  }

  if (fieldName.endsWith("Attachment") || fieldName === "additionalInformation") {
    return 6;
  }

  return 7;
}

export function VendorRegistrationForm({ options }: VendorRegistrationFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    submitVendorRegistrationAction,
    EMPTY_ACTION_STATE,
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [countryCode, setCountryCode] = useState("");
  const [coverageScope, setCoverageScope] =
    useState<CoverageScope>("SPECIFIC_CITIES");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([]);
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [clientUploadError, setClientUploadError] = useState<string | null>(null);
  const [selectedUploadFiles, setSelectedUploadFiles] =
    useState<SelectedUploadFiles>({});
  const [uploadFieldErrors, setUploadFieldErrors] = useState<UploadFieldErrors>(
    {},
  );

  const selectedCountry = useMemo(
    () => options.countries.find((country) => country.code === countryCode) ?? null,
    [countryCode, options.countries],
  );

  const selectedCategory = useMemo(
    () => options.categories.find((category) => category.id === categoryId) ?? null,
    [categoryId, options.categories],
  );

  const subcategoryOptions = selectedCategory?.subcategories ?? [];
  const allSubcategoriesSelected =
    subcategoryOptions.length > 0 &&
    subcategoryIds.length === subcategoryOptions.length;
  const countryGroups = useMemo(() => {
    const groups = new Map<string, typeof options.countries>();

    for (const country of options.countries) {
      const key = country.regionGroup || "Other";
      const current = groups.get(key) ?? [];
      current.push(country);
      groups.set(key, current);
    }

    return [...groups.entries()];
  }, [options.countries]);

  const cityGroups = useMemo(() => {
    if (!selectedCountry) {
      return [];
    }

    const sourceCities =
      coverageScope === "SPECIFIC_CITIES"
        ? selectedCountry.cities
        : options.countries
            .filter((country) =>
              coverageScope === "ALL_COUNTRY"
                ? country.code === selectedCountry.code
                : coverageScope === "GLOBAL"
                  ? true
                  : country.regionGroup === coverageScope,
            )
            .flatMap((country) => country.cities);

    const filtered = sourceCities.filter((city) => {
      if (!citySearch.trim()) {
        return true;
      }

      const normalizedSearch = citySearch.trim().toLowerCase();
      return [city.name, city.region].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    });

    const regionGroups = new Map<string, typeof filtered>();

    for (const city of filtered) {
      const key = city.region || "Other";
      const current = regionGroups.get(key) ?? [];
      current.push(city);
      regionGroups.set(key, current);
    }

    return [...regionGroups.entries()].map(([region, cities]) => ({
      region,
      cities,
    }));
  }, [citySearch, coverageScope, options.countries, selectedCountry]);

  const selectedCitySummary = useMemo(() => {
    const cityMap = new Map(
      options.countries.flatMap((country) => country.cities).map((city) => [city.id, city]),
    );

    return selectedCityIds
      .map((cityId) => cityMap.get(cityId)?.name)
      .filter(Boolean) as string[];
  }, [options.countries, selectedCityIds]);

  const autoCoverageCityIds = useMemo(
    () =>
      countryCode
        ? getCoverageCityIds({
            countries: options.countries,
            countryCode,
            coverageScope,
          })
        : [],
    [countryCode, coverageScope, options.countries],
  );

  useEffect(() => {
    if (coverageScope === "SPECIFIC_CITIES") {
      if (!selectedCountry) {
        setSelectedCityIds([]);
        return;
      }

      setSelectedCityIds((current) =>
        current.filter((cityId) =>
          selectedCountry.cities.some((city) => city.id === cityId),
        ),
      );
      return;
    }

    setSelectedCityIds(autoCoverageCityIds);
  }, [autoCoverageCityIds, coverageScope, selectedCountry]);

  useEffect(() => {
    if (!selectedCategory) {
      setSubcategoryIds([]);
      return;
    }

    setSubcategoryIds((current) =>
      current.filter((subcategoryId) =>
        selectedCategory.subcategories.some(
          (subcategory) => subcategory.id === subcategoryId,
        ),
      ),
    );
  }, [selectedCategory]);

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  useEffect(() => {
    const firstInvalidField = Object.keys(state.fieldErrors ?? {})[0];

    if (firstInvalidField) {
      setCurrentStep(getStepForField(firstInvalidField));
    }
  }, [state.fieldErrors]);

  const serverFieldError = useMemo(
    () => firstFieldError(state.fieldErrors),
    [state.fieldErrors],
  );

  const displayState = clientUploadError
    ? { error: clientUploadError }
    : serverFieldError
      ? { error: serverFieldError }
      : state;

  const hiddenCityInputs =
    coverageScope === "SPECIFIC_CITIES" ? (
      selectedCityIds.map((cityId) => (
        <input key={cityId} type="hidden" name="cityIds" value={cityId} />
      ))
    ) : (
      autoCoverageCityIds.map((cityId) => (
        <input key={cityId} type="hidden" name="cityIds" value={cityId} />
      ))
    );

  function handleUploadFileChange(name: AttachmentFieldName, file: File | null) {
    const field = ATTACHMENT_FIELDS.find((item) => item.name === name);
    const fileError = file && field ? validateUploadFile(file, field.label) : null;

    setClientUploadError(null);

    if (fileError) {
      setSelectedUploadFiles((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
      setUploadFieldErrors((current) => ({
        ...current,
        [name]: fileError,
      }));
      return;
    }

    setUploadFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setSelectedUploadFiles((current) => {
      const next = { ...current };

      if (file) {
        next[name] = file;
      } else {
        delete next[name];
      }

      return next;
    });
  }

  function validateUploadsBeforeSubmit() {
    const uploadValidation = validateUploadInputs(selectedUploadFiles);

    if (uploadValidation.message) {
      setClientUploadError(uploadValidation.message);
      setUploadFieldErrors(uploadValidation.fieldErrors);
      setCurrentStep(6);
      return false;
    }

    setClientUploadError(null);
    setUploadFieldErrors({});
    return true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateUploadsBeforeSubmit()) {
      return;
    }

    const formData = buildCompleteRegistrationFormData(
      event.currentTarget,
      selectedUploadFiles,
    );

    startTransition(() => {
      formAction(formData);
    });
  }

  function handleContinue() {
    if (currentStep === 6 && !validateUploadsBeforeSubmit()) {
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  }

  return (
    <form
      action={formAction}
      onChange={(event) => {
        if (
          clientUploadError &&
          event.target instanceof HTMLInputElement &&
          event.target.type === "file"
        ) {
          setClientUploadError(null);
        }
      }}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-8"
    >
      <Card className="overflow-hidden">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                  Supplier Registration
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
                  Public registration request
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
                  Submit a complete supplier registration request. Core company
                  details and key compliance documents are required, while
                  supporting financial documents and extra notes can be added
                  when available. The system still checks for duplicate CR, VAT,
                  and email details before saving the request.
                </p>
              </div>
              <Badge variant="purple">8 required steps</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                <span>
                  Step {currentStep + 1} of {STEPS.length}
                </span>
                <span>{STEPS[currentStep].title}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-panel-soft)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))]"
                  style={{
                    width: `${((currentStep + 1) / STEPS.length) * 100}%`,
                  }}
                />
              </div>
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                {STEPS[currentStep].subtitle}
              </p>
              <div className="flex flex-wrap gap-2">
                {STEPS.map((step, index) => (
                  <StepPill
                    key={step.title}
                    index={index}
                    title={step.title}
                    active={index === currentStep}
                    onClick={() => setCurrentStep(index)}
                  />
                ))}
              </div>
            </div>
          </div>

          <SectionPanel active={currentStep === 0}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="companyName">
                  Company Name <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="companyName" name="companyName" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="legalName">
                  Legal Name <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="legalName" name="legalName" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="companyEmail">
                  Company Email <span className="text-[#991b1b]">*</span>
                </Label>
                <Input
                  id="companyEmail"
                  name="companyEmail"
                  type="email"
                  required
                  disabled={isPending}
                />
              </div>
              <div>
                <Label htmlFor="companyPhone">
                  Company Phone <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="companyPhone" name="companyPhone" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="website">
                  Website <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="website" name="website" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="crNumber">
                  CR Number <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="crNumber" name="crNumber" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="vatNumber">
                  VAT Number <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="vatNumber" name="vatNumber" required disabled={isPending} />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel active={currentStep === 1}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="countryCode">
                  Country <span className="text-[#991b1b]">*</span>
                </Label>
                <Select
                  id="countryCode"
                  name="countryCode"
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                  disabled={isPending}
                >
                  <option value="">Select country</option>
                    {countryGroups.map(([region, countries]) => (
                      <optgroup key={region} label={region}>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name} ({country.code})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                </Select>
              </div>
              <div className="md:col-span-2 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      Coverage Scope
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                      Choose a structured coverage scope first. Manual city
                      selection remains available when specific cities are
                      needed.
                    </p>
                    {selectedCountry?.code === "SA" ? (
                      <p className="mt-2 text-xs leading-6 text-[var(--color-accent)]">
                        Saudi Arabia uses the full region-grouped city and
                        governorate list, including the All Saudi Cities option.
                      </p>
                    ) : null}
                  </div>
                  {selectedCountry?.code === "SA" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setCoverageScope("ALL_COUNTRY")}
                    >
                      All Saudi Cities
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {COVERAGE_SCOPE_OPTIONS.map((option) => {
                    const label =
                      option.value === "ALL_COUNTRY"
                        ? formatCoverageLabel(
                            option.value,
                            selectedCountry?.name,
                            selectedCountry?.code,
                          )
                        : option.label;

                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-[20px] border px-4 py-3 text-sm transition-colors",
                          coverageScope === option.value
                            ? "border-[var(--color-primary)] bg-white text-[var(--color-primary)]"
                            : "border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-primary)]",
                        )}
                      >
                        <input
                          type="radio"
                          name="coverageScope"
                          value={option.value}
                          checked={coverageScope === option.value}
                          onChange={(event) =>
                            setCoverageScope(event.target.value as CoverageScope)
                          }
                          className="h-4 w-4 accent-[var(--color-primary)]"
                          disabled={isPending || !countryCode}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2 rounded-[24px] border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      City Coverage <span className="text-[#991b1b]">*</span>
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                      {coverageScope === "SPECIFIC_CITIES"
                        ? "Search and choose one or more cities. The list groups Saudi cities by region."
                        : "Manual city selection is locked because the coverage scope already selects all matching cities."}
                    </p>
                  </div>
                  <Badge variant="neutral">{selectedCityIds.length} selected</Badge>
                </div>

                {coverageScope === "SPECIFIC_CITIES" ? (
                  <div className="mt-4 space-y-4">
                    <div className="max-w-sm">
                      <Input
                        value={citySearch}
                        onChange={(event) => setCitySearch(event.target.value)}
                        placeholder="Search cities by name or region"
                        disabled={isPending || !selectedCountry}
                      />
                    </div>
                    {!selectedCountry ? (
                      <div className="rounded-[20px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                        Choose a country first to unlock the city list.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cityGroups.map((group) => (
                          <div
                            key={group.region}
                            className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                              {group.region}
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {group.cities.map((city) => {
                                const checked = selectedCityIds.includes(city.id);

                                return (
                                  <label
                                    key={city.id}
                                    className={cn(
                                      "flex cursor-pointer items-start gap-3 rounded-[18px] border px-3 py-3 text-sm transition-colors",
                                      checked
                                        ? "border-[var(--color-primary)] bg-white text-[var(--color-primary)]"
                                        : "border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-primary)]",
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      name="cityIds"
                                      value={city.id}
                                      checked={checked}
                                      onChange={(event) => {
                                        const nextChecked = event.target.checked;
                                        setSelectedCityIds((current) =>
                                          nextChecked
                                            ? [...current, city.id]
                                            : current.filter((id) => id !== city.id),
                                        );
                                      }}
                                      className="mt-1 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                                      disabled={isPending}
                                    />
                                    <span className="min-w-0">
                                      <span className="block font-semibold">{city.name}</span>
                                      <span className="block text-xs text-[var(--color-muted)]">
                                        {city.region}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {hiddenCityInputs}
                    <div className="mt-4 rounded-[20px] border border-[rgba(49,19,71,0.14)] bg-[rgba(49,19,71,0.06)] p-4 text-sm leading-7 text-[var(--color-ink)]">
                      <p className="font-semibold">
                        {formatCoverageLabel(
                          coverageScope,
                          selectedCountry?.name,
                          selectedCountry?.code,
                        )}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                        {selectedCountry
                          ? `${selectedCityIds.length} cities are selected automatically for this coverage scope.`
                          : "Select a country to resolve the structured coverage automatically."}
                      </p>
                      {selectedCitySummary.length > 0 ? (
                        <p className="mt-3 text-xs leading-6 text-[var(--color-muted)]">
                          {selectedCitySummary.slice(0, 4).join(", ")}
                          {selectedCitySummary.length > 4
                            ? ` +${selectedCitySummary.length - 4} more`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="addressLine1">
                  Address Line 1 <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="addressLine1" name="addressLine1" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="addressLine2">
                  Address Line 2 <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="addressLine2" name="addressLine2" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="district">
                  District <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="district" name="district" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="region">
                  Region <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="region" name="region" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="postalCode">
                  Postal Code <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="postalCode" name="postalCode" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="poBox">
                  P.O. Box <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="poBox" name="poBox" required disabled={isPending} />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel active={currentStep === 2}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="businessDescription">
                  Business Description <span className="text-[#991b1b]">*</span>
                </Label>
                <Textarea
                  id="businessDescription"
                  name="businessDescription"
                  rows={5}
                  required
                  disabled={isPending}
                />
              </div>
              <div>
                <Label htmlFor="yearsInBusiness">
                  Years in Business <span className="text-[#991b1b]">*</span>
                </Label>
                <Input
                  id="yearsInBusiness"
                  name="yearsInBusiness"
                  type="number"
                  min="0"
                  required
                  disabled={isPending}
                />
              </div>
              <div>
                <Label htmlFor="employeeCount">
                  Employee Count <span className="text-[#991b1b]">*</span>
                </Label>
                <Input
                  id="employeeCount"
                  name="employeeCount"
                  type="number"
                  min="1"
                  required
                  disabled={isPending}
                />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel active={currentStep === 3}>
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="categoryId">
                    Main Category <span className="text-[#991b1b]">*</span>
                  </Label>
                  <Select
                    id="categoryId"
                    name="categoryId"
                    value={categoryId}
                    onChange={(event) => {
                      setCategoryId(event.target.value);
                      setSubcategoryIds([]);
                    }}
                    disabled={isPending}
                  >
                    <option value="">Select category</option>
                    {options.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                        {category.code ? ` (${category.code})` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      Subcategories <span className="text-[#991b1b]">*</span>
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                      Pick one or more subcategories. The first selected
                      subcategory becomes the primary registration match.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={allSubcategoriesSelected ? "green" : "neutral"}>
                      {subcategoryIds.length} of {subcategoryOptions.length} selected
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setSubcategoryIds(
                          subcategoryOptions.map((subcategory) => subcategory.id),
                        )
                      }
                      disabled={isPending || !selectedCategory || subcategoryOptions.length === 0}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setSubcategoryIds([])}
                      disabled={isPending || subcategoryIds.length === 0}
                    >
                      Clear selection
                    </Button>
                  </div>
                </div>

                {!selectedCategory ? (
                  <div className="mt-4 rounded-[20px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                    Choose a category first to unlock the subcategory list.
                  </div>
                ) : subcategoryOptions.length === 0 ? (
                  <div className="mt-4 rounded-[20px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                    No subcategories are configured for this category yet.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {subcategoryOptions.map((subcategory) => {
                      const checked = subcategoryIds.includes(subcategory.id);

                      return (
                        <label
                          key={subcategory.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-[20px] border px-4 py-3 text-sm transition-colors",
                            checked
                              ? "border-[var(--color-primary)] bg-white text-[var(--color-primary)]"
                              : "border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-primary)]",
                          )}
                        >
                          <input
                            type="checkbox"
                            name="subcategoryIds"
                            value={subcategory.id}
                            checked={checked}
                            onChange={(event) => {
                              const nextChecked = event.target.checked;
                              setSubcategoryIds((current) =>
                                nextChecked
                                  ? [...current, subcategory.id]
                                  : current.filter((id) => id !== subcategory.id),
                              );
                            }}
                            className="mt-1 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                            disabled={isPending}
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold">
                              {subcategory.name}
                            </span>
                            <span className="block text-xs text-[var(--color-muted)]">
                              {subcategory.code ?? "No code"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedCategory && subcategoryOptions.length > 0 ? (
                  <p className="mt-4 text-xs leading-6 text-[var(--color-muted)]">
                    {subcategoryIds.length} of {subcategoryOptions.length}{" "}
                    subcategories selected for{" "}
                    {selectedCategory.code
                      ? `${selectedCategory.name} (${selectedCategory.code})`
                      : selectedCategory.name}
                    .
                  </p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="servicesOverview">
                  Products / Services Summary{" "}
                  <span className="text-[#991b1b]">*</span>
                </Label>
                <Textarea
                  id="servicesOverview"
                  name="servicesOverview"
                  rows={5}
                  required
                  disabled={isPending}
                  placeholder="Describe the products, services, capabilities, and delivery scope."
                />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel active={currentStep === 4}>
            <div className="space-y-4">
              <ReferenceGroup index={1} isPending={isPending} />
              <ReferenceGroup index={2} isPending={isPending} />
              <ReferenceGroup index={3} isPending={isPending} />
            </div>
          </SectionPanel>

          <SectionPanel active={currentStep === 5}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="bankName">
                  Bank Name <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="bankName" name="bankName" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="accountName">
                  Account Name <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="accountName" name="accountName" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="iban">
                  IBAN <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="iban" name="iban" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="swiftCode">
                  SWIFT Code <span className="text-[#991b1b]">*</span>
                </Label>
                <Input id="swiftCode" name="swiftCode" required disabled={isPending} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bankAccountNumber">
                  Bank Account Number <span className="text-[#991b1b]">*</span>
                </Label>
                <Input
                  id="bankAccountNumber"
                  name="bankAccountNumber"
                  required
                  disabled={isPending}
                />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel active={currentStep === 6}>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ATTACHMENT_FIELDS.map((field) => (
                  <AttachmentField
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    helper={field.helper}
                    required={field.required}
                    isPending={isPending}
                    selectedFile={selectedUploadFiles[field.name] ?? null}
                    error={uploadFieldErrors[field.name] ?? null}
                    onFileChange={handleUploadFileChange}
                  />
                ))}
              </div>
              {clientUploadError ? (
                <FormStateMessage state={{ error: clientUploadError }} />
              ) : null}
              <div>
                <Label htmlFor="additionalInformation">
                  Additional Information
                </Label>
                <Textarea
                  id="additionalInformation"
                  name="additionalInformation"
                  rows={6}
                  disabled={isPending}
                  placeholder="Include anything the review team should know."
                />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel active={currentStep === 7}>
            <div className="space-y-6">
              <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  Final Declaration
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  Confirm the information provided is accurate and complete. The
                  supplier registration request will be saved with a pending
                  review status only after you accept this declaration.
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="declarationName">
                      Signatory Name <span className="text-[#991b1b]">*</span>
                    </Label>
                    <Input
                      id="declarationName"
                      name="declarationName"
                      required
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="declarationTitle">
                      Signatory Title <span className="text-[#991b1b]">*</span>
                    </Label>
                    <Input
                      id="declarationTitle"
                      name="declarationTitle"
                      required
                      disabled={isPending}
                    />
                  </div>
                </div>
                <label className="mt-5 flex items-start gap-3 rounded-[20px] border border-[var(--color-border)] bg-white p-4 text-sm leading-7 text-[var(--color-ink)]">
                  <input
                    type="checkbox"
                    name="declarationAccepted"
                    value="on"
                    required
                    disabled={isPending}
                    className="mt-1 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                  />
                  <span>
                    I confirm that the information, attachments, and supporting
                    documents submitted in this form are true and complete to the
                    best of my knowledge.
                  </span>
                </label>
              </div>

              <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                  Submission checklist
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ChecklistItem label="CR attachment" />
                  <ChecklistItem label="VAT attachment" />
                  <ChecklistItem label="Company profile" />
                </div>
                <p className="mt-4 text-xs leading-6 text-[var(--color-muted)]">
                  Financials, bank certificate, and additional information can
                  be added when available, but they are no longer required for
                  submission.
                </p>
              </div>
            </div>
          </SectionPanel>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
              disabled={currentStep === 0 || isPending}
            >
              Back
            </Button>
            <div className="flex flex-wrap gap-3">
              {currentStep < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleContinue}
                  disabled={isPending}
                >
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Submitting..." : "Submit Registration"}
                </Button>
              )}
            </div>
          </div>

          <FormStateMessage state={displayState} />
        </CardContent>
      </Card>
    </form>
  );
}

function ChecklistItem({ label }: { label: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
      {label}
    </div>
  );
}
