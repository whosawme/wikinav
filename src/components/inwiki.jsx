// Then in your ChurnSimulation component, wrap the timeline section:
{showTimeline && (
    <ErrorBoundary
      FallbackComponent={TimelineErrorFallback}
      onReset={() => {
        setTimelineData([]);
      }}
    >
      <div className="h-64 p-4 border-t">
        {/* Your existing timeline code */}
      </div>
    </ErrorBoundary>
  )}