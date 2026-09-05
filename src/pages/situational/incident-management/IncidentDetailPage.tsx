import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident, useUpdateIncident } from '../../../hooks';
import { IncidentDetailView } from './IncidentDetailView';
import { SkeletonKPICard } from '../../../components/ui/shared/SkeletonLoader';
import { AlertCircle, ArrowLeft } from 'lucide-react';

const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: incident, isLoading, isError } = useIncident(id || null);
  const updateIncident = useUpdateIncident();

  const handleVerify = (incidentId: string) => {
    updateIncident.mutate({
      id: incidentId,
      updates: { status: 'Verified', verifiedBy: 'Officer Rosli (NADMA)' },
    });
  };

  const handleBack = () => {
    navigate('/situational/incidents');
  };

  const handleTrackInIntelligence = () => {
    navigate('/situational/intelligence');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
        </div>
      </div>
    );
  }

  if (isError || !incident) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
        <AlertCircle size={40} className="text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Incident Record Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested disaster incident reference (ID: {id}) could not be retrieved from the database.
        </p>
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Return to Incident Management
        </button>
      </div>
    );
  }

  return (
    <IncidentDetailView
      incident={incident}
      onBack={handleBack}
      onVerify={handleVerify}
      onTrackInIntelligence={handleTrackInIntelligence}
    />
  );
};

export default IncidentDetailPage;
