import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import LeadInquiryContent, { LeadFormInfo } from "./LeadInquiryContent";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
        <p className="text-sm text-gray-500">This inquiry form doesn't exist or is no longer available.</p>
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

export default function LeadInquiryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: formInfo, isLoading, isError, error } = useQuery<LeadFormInfo, AxiosError>({
    queryKey: ["public-inquiry-form", slug],
    queryFn: () => axios.get(`${BASE}/api/public/form/${slug}`).then(r => r.data),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) return <Spinner />;

  if (isError || !formInfo) {
    const httpStatus = (error as AxiosError | null)?.response?.status;
    if (httpStatus === 403) return <UnavailableState />;
    return <NotFoundState />;
  }

  return <LeadInquiryContent formInfo={formInfo} />;
}
