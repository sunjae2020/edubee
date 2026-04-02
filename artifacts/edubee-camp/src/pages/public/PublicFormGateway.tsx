import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import LeadInquiryContent from "./LeadInquiryContent";

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

function CampApplicationRedirect({ slug }: { slug: string }) {
  const [, navigate] = useLocation();

  useEffect(() => {
    sessionStorage.setItem("formSlug", slug);
    navigate("/apply");
  }, [slug, navigate]);

  return <Spinner />;
}

export default function PublicFormGateway() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: form, isLoading, isError } = useQuery<FormInfo>({
    queryKey: ["public-form", slug],
    queryFn: () => axios.get(`${BASE}/api/public/form/${slug}`).then(r => r.data),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) return <Spinner />;
  if (isError || !form) return <NotFoundState />;

  if (form.formType === "lead_inquiry") {
    return <LeadInquiryContent formInfo={form} />;
  }

  // camp_application and any other types → redirect to /apply with slug context
  return <CampApplicationRedirect slug={slug} />;
}
