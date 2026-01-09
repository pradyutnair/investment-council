import { ThesisForm } from '@/components/research/thesis-form';

export default function NewResearchPage() {
  return (
    <div className="h-full overflow-auto bg-background">
      <div className="w-full min-h-full">
        <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 py-10 lg:py-14">
          {/* Form Section */}
          <div className="w-full">
            <ThesisForm />
          </div>
        </div>
      </div>
    </div>
  );
}
