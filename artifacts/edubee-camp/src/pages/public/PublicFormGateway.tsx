import { useParams, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import LeadInquiryContent from "./LeadInquiryContent";
import CampApplicationFullPage from "./CampApplicationFullPage";
import { type PublicProgram } from "@/lib/program-utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface FormInfo {
  id: string;
  name: string;
  description: string | null;
  formType: string;
  status: string;
  redirectUrl: string | null;
}

function Spinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Form Not Found</h2>
        <p className="text-sm text-gray-500">This form doesn't exist or is no longer available.</p>
      </div>
    </div>
  );
}

function UnavailableState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Form Temporarily Unavailable</h2>
        <p className="text-sm text-gray-500">This form is currently paused. Please contact us for assistance.</p>
      </div>
    </div>
  );
}

function CampFormLoader({ form, partnerCode }: { form: FormInfo; partnerCode?: string }) {
  const { data: programs = [], isLoading } = useQuery<PublicProgram[]>({
    queryKey: ["public-packages"],
    queryFn: () => axios.get(`${BASE}/api/public/packages`).then(r => r.data),
  });

  if (isLoading) return <Spinner />;

  return <CampApplicationFullPage formInfo={form} programs={programs} partnerCode={partnerCode} />;
}

export default function PublicFormGateway() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  // Read ?partner= query param for pre-filling referral code
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const partnerCode = searchParams.get("partner") || undefined;

  const { data: form, isLoading, isError, error } = useQuery<FormInfo, AxiosError>({
    queryKey: ["public-form", slug],
    queryFn: () => axios.get(`${BASE}/api/public/form/${slug}`).then(r => r.data),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) return <Spinner />;

  if (isError || !form) {
    const httpStatus = (error as AxiosError | null)?.response?.status;
    if (httpStatus === 403) return <UnavailableState />;
    return <NotFoundState />;
  }

  if (form.formType === "lead_inquiry") {
    return <LeadInquiryContent formInfo={form} />;
  }

  // camp_application → single-page full form (no redirect)
  return <CampFormLoader form={form} partnerCode={partnerCode} />;
}
