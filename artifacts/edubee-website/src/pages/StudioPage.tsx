import { useState, useEffect, lazy, Suspense } from 'react'

const Studio = lazy(() =>
  import('sanity').then(mod => ({ default: mod.Studio }))
)

export default function StudioPage() {
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    import('../../sanity.config').then(mod => setConfig(mod.default))
  }, [])

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F4F3F1]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#F5821F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#57534E]">Loading Sanity Studio...</p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#F4F3F1]">
        <p className="text-sm text-[#57534E]">Loading Studio...</p>
      </div>
    }>
      <div style={{ height: '100vh' }}>
        <Studio config={config} />
      </div>
    </Suspense>
  )
}
