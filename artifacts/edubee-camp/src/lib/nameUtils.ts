export interface NameFields {
  firstName?:    string | null;
  lastName?:     string | null;
  englishName?:  string | null;
  originalName?: string | null;
}

export function buildFullName(fields: NameFields, fallback = "—"): string {
  const first = fields.firstName?.trim() || "";
  const last  = fields.lastName?.trim().toUpperCase() || "";
  if (first && last) return `${first} ${last}`;
  if (first)         return first;
  if (last)          return last;
  return fallback;
}

export function buildDisplayName(fields: NameFields, fallback = "—"): string {
  const full     = buildFullName(fields, "");
  const original = fields.originalName?.trim() || "";
  if (full && original) return `${full} (${original})`;
  if (full)             return full;
  if (original)         return original;
  return fallback;
}

export function buildAccountName(fields: NameFields): string {
  return buildFullName(fields, "Unknown");
}

export function buildShortName(fields: NameFields, fallback = "—"): string {
  const first = fields.firstName?.trim() || "";
  const last  = fields.lastName?.trim() || "";
  if (first && last) return `${first} ${last[0].toUpperCase()}.`;
  return buildFullName(fields, fallback);
}

export function nameFromAccount(account: {
  firstName?: string | null;
  lastName?:  string | null;
  englishName?: string | null;
  originalName?: string | null;
  name?: string | null;
}): NameFields {
  if (account.firstName || account.lastName) {
    return {
      firstName:    account.firstName,
      lastName:     account.lastName,
      englishName:  account.englishName,
      originalName: account.originalName,
    };
  }
  return { firstName: account.name };
}

export function nameFromContact(contact: {
  firstName?: string | null;
  lastName?:  string | null;
  englishName?: string | null;
  originalName?: string | null;
  otherName?: string | null;
}): NameFields {
  return {
    firstName:    contact.firstName,
    lastName:     contact.lastName,
    englishName:  contact.englishName,
    originalName: (contact.originalName || contact.otherName) ?? null,
  };
}

export function nameFromLead(lead: {
  firstName?:    string | null;
  lastName?:     string | null;
  englishName?:  string | null;
  originalName?: string | null;
  fullName?:     string | null;
}): NameFields {
  if (lead.firstName || lead.lastName) {
    return {
      firstName:    lead.firstName,
      lastName:     lead.lastName,
      englishName:  lead.englishName,
      originalName: lead.originalName,
    };
  }
  return { firstName: lead.fullName };
}

export function nameFromApplication(application: {
  firstName?:    string | null;
  lastName?:     string | null;
  englishName?:  string | null;
  originalName?: string | null;
  applicantName?: string | null;
}): NameFields {
  if (application.firstName || application.lastName) {
    return {
      firstName:    application.firstName,
      lastName:     application.lastName,
      englishName:  application.englishName,
      originalName: application.originalName,
    };
  }
  return { firstName: application.applicantName };
}

export function nameFromCampApplication(app: {
  applicantFirstName?:    string | null;
  applicantLastName?:     string | null;
  applicantEnglishName?:  string | null;
  applicantOriginalName?: string | null;
  applicantName?:         string | null;
}): NameFields {
  if (app.applicantFirstName || app.applicantLastName) {
    return {
      firstName:    app.applicantFirstName,
      lastName:     app.applicantLastName,
      englishName:  app.applicantEnglishName,
      originalName: app.applicantOriginalName,
    };
  }
  return { firstName: app.applicantName };
}
