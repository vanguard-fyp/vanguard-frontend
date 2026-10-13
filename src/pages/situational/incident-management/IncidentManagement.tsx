import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  MapPin,
  ChevronRight,
  Plus,
  X,
  User,
  RadioTower,
  ShieldAlert,
  Globe,
  RefreshCw,
  ExternalLink,
  Edit3,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  BrainCircuit,
} from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import { useIncidents, useCreateIncident, useUpdateIncident, useDeleteIncident, useGlobalIncidents, usePaginatedQuery, usePromotePrediction } from '../../../hooks';
import { incidentService } from '../../../services/incidentService';
import { PaginationBar } from '../../../components/ui/shared/PaginationBar';
import { MediaUploader, hasPendingUploads, uploadedRefs, type MediaItem } from '../../../components/ui/shared/MediaUploader';
import type { LocationResolution } from '../../../components/ui/shared/MalaysiaLocationPicker';
import { SkeletonList } from '../../../components/ui/shared/SkeletonLoader';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { MalaysiaLocationPicker } from '../../../components/ui/shared/MalaysiaLocationPicker';
import { PhoneInput } from '../../../components/ui/shared/PhoneInput';
import { HazardPredictionsPanel } from '../../../components/ui/situational/HazardPredictionsPanel';
import { formatFullLocation } from '../../../utils/locationFormatter';
import { editedFieldVerification } from '../../../utils/facts';
import type { DisasterType, SeverityLevel, DisasterLevel, GdacsEvent, IncidentManagementProps, Incident, FactField, FactState } from '../../../types';
import { GDACS_HAZARD_DEFS, statusIcons, typeIcons } from '../../../constants/situational';
import { containerAnim, itemAnim } from '../../../constants';

const SOURCE_LABEL: Record<'Citizen Reported' | 'Metrological / Sensor' | 'Agency Patrol' | 'Emergency 999', string> = {
  'Agency Patrol': 'Agency Patrol',
  'Emergency 999': 'Emergency 999 Call',
  'Citizen Reported': 'Citizen Report (relayed by officer)',
  'Metrological / Sensor': 'Sensor Alert',
};

function getCleanDisplayId(id: string, displayId?: string): string {
  if (displayId) return displayId;
  if (id.startsWith('inc-')) {
    const parts = id.split('-');
    if (parts.length >= 3) return `${parts[0].toUpperCase()}-${parts[1]}-${parts[2]}`;
  }
  if (id.length > 13) {
    return `INC-${id.slice(0, 8).toUpperCase()}`;
  }
  return id.toUpperCase();
}

const ALERT_RANK: Record<string, number> = { Red: 0, Orange: 1, Green: 2 };

const IncidentManagement: React.FC<IncidentManagementProps> = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { data: incidents = [], isLoading } = useIncidents();
  const {
    data: globalDisasters = [],
    isLoading: isGlobalLoading,
    refetch: refetchGlobal,
    isFetching: isGlobalFetching,
  } = useGlobalIncidents();
  const createIncidentMutation = useCreateIncident();
  const updateIncidentMutation = useUpdateIncident();
  const deleteIncidentMutation = useDeleteIncident();

  // Scope Switcher: National EOC DB vs Global Live GDACS
  const [viewScope, setViewScope] = useState<'national' | 'global'>('national');

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Global filters
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalAlertLevel, setGlobalAlertLevel] = useState<string>('All');
  const [globalHazardType, setGlobalHazardType] = useState<string>('All');
  const [globalPage, setGlobalPage] = useState(0);

  // New Incident Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<DisasterType>('Flood');
  const [newLocation, setNewLocation] = useState('');
  // No default place: state/district come from the pin.
  const [newState, setNewState] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newPostcode, setNewPostcode] = useState('');
  const [newSeverity, setNewSeverity] = useState<SeverityLevel>('High');
  const [newDisasterLevel, setNewDisasterLevel] = useState<DisasterLevel>('Level 2: State');
  const [newSourceType, setNewSourceType] = useState<
    'Citizen Reported' | 'Metrological / Sensor' | 'Agency Patrol' | 'Emergency 999'
  >('Agency Patrol');
  const [newDescription, setNewDescription] = useState('');
  const [newReporterContact, setNewReporterContact] = useState('');
  const [newWeatherCondition, setNewWeatherCondition] = useState('');
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [weatherAutoLoaded, setWeatherAutoLoaded] = useState(false);
  // No default pin: an unplaced pin is an unresolved location, never Kota Bharu.
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [locationResolution, setLocationResolution] = useState<LocationResolution | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  // Impact facts: '' = unknown (sent with field_verification "unknown").
  const [newAffected, setNewAffected] = useState('');
  const [newCasualties, setNewCasualties] = useState('');
  const [newInfra, setNewInfra] = useState<'' | 'Severe' | 'Moderate' | 'Minor' | 'None'>('');
  const [newAccess, setNewAccess] = useState('');
  const [newMedia, setNewMedia] = useState<MediaItem[]>([]);
  const [lastCreated, setLastCreated] = useState<Incident | null>(null);

  // Auto-detect weather via Open-Meteo when coordinates are pinned/changed
  useEffect(() => {
    const latN = parseFloat(newLat);
    const lngN = parseFloat(newLng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN) || (latN === 0 && lngN === 0)) return;
    let active = true;
    setFetchingWeather(true);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latN}&longitude=${lngN}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.current) return;
        const curr = data.current;
        const code = curr.weather_code ?? 0;
        let cond = 'Clear / Fair';
        if (code >= 1 && code <= 3) cond = 'Partly Cloudy';
        else if (code >= 51 && code <= 55) cond = 'Light Drizzle';
        else if (code >= 61 && code <= 63) cond = 'Moderate Rain';
        else if (code >= 65 && code <= 67) cond = 'Heavy Rain';
        else if (code >= 80 && code <= 82) cond = 'Rain Showers';
        else if (code >= 95) cond = 'Thunderstorm';
        const summary = `${cond}· ${Math.round(curr.temperature_2m)}°C· Wind ${Math.round(curr.wind_speed_10m)} km/h${curr.precipitation > 0 ? `· ${curr.precipitation}mm/h precip` : ''}`;
        setNewWeatherCondition(summary);
        setWeatherAutoLoaded(true);
      })
      .catch(() => { })
      .finally(() => {
        if (active) setFetchingWeather(false);
      });
    return () => {
      active = false;
    };
  }, [newLat, newLng]);

  // Form Validation Errors (inline red span)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Duplicate Detection Workflow State
  const [duplicateMatch, setDuplicateMatch] = useState<Incident | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  // Edit Incident State (includes Disaster Management Authority Impact Assessment updates)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSeverity, setEditSeverity] = useState<SeverityLevel>('High');
  const [editDisasterLevel, setEditDisasterLevel] = useState<DisasterLevel>('Level 2: State');
  const [editStatus, setEditStatus] = useState<string>('Unverified');
  const [editDescription, setEditDescription] = useState('');
  const [editAffectedPopulation, setEditAffectedPopulation] = useState<number>(0);
  const [editCasualtiesCount, setEditCasualtiesCount] = useState<number>(0);
  const [editInfrastructureDamage, setEditInfrastructureDamage] = useState<'Severe' | 'Moderate' | 'Minor' | 'None'>('None');
  const [editAccessibilityScore, setEditAccessibilityScore] = useState<number>(50);
  const [editWeatherCondition, setEditWeatherCondition] = useState<string>('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const [editExistingMedia, setEditExistingMedia] = useState<string[]>([]);
  const [editMedia, setEditMedia] = useState<MediaItem[]>([]);

  // Delete / Archive Incident State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Prediction the report form was opened from (null for a normal report).
  const [promotingPredictionId, setPromotingPredictionId] = useState<string | null>(null);
  const promotePrediction = usePromotePrediction();
  const [incidentToDelete, setIncidentToDelete] = useState<Incident | null>(null);

  // Count active incidents (excluding resolved, rejected, and archived)
  const activeIncidentsCount = useMemo(() => {
    return incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected' && i.status !== 'Archived').length;
  }, [incidents]);

  const dynamicDisasterTypes = useMemo(() => {
    const eligible =
      filterStatus === 'All'
        ? incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected' && i.status !== 'Archived')
        : incidents.filter((i) => i.status === filterStatus);
    const typesInDb = Array.from(new Set(eligible.map((i) => i.type))).filter(Boolean);
    return ['All', ...typesInDb];
  }, [incidents, filterStatus]);

  useEffect(() => {
    if (selectedCategory !== 'All' && !dynamicDisasterTypes.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [dynamicDisasterTypes, selectedCategory]);

  // Displayed list = one server page at a time (filters applied server-side).
  // The full list above is still used for category counts and duplicate checks.
  const pageFilters = useMemo(
    () => ({
      severity: filterSeverity === 'All' ? undefined : filterSeverity,
      status: filterStatus === 'All' ? undefined : filterStatus,
      active_only: filterStatus === 'All' ? true : undefined,
      disaster_type: selectedCategory === 'All' ? undefined : selectedCategory,
      search: searchQuery.trim() || undefined,
    }),
    [filterSeverity, filterStatus, selectedCategory, searchQuery]
  );
  const incidentPage = usePaginatedQuery(['incidents'], (args) => incidentService.getIncidentsPage(args), pageFilters, 10);
  const displayedIncidents = incidentPage.items;
  void visibleCount;
  void setVisibleCount;

  // Global Disasters Filter
  const filteredGlobalDisasters = useMemo(() => {
    return (globalDisasters as GdacsEvent[]).filter((g) => {
      const matchSearch =
        !globalSearch.trim() ||
        g.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
        g.country.toLowerCase().includes(globalSearch.toLowerCase()) ||
        g.hazardType.toLowerCase().includes(globalSearch.toLowerCase()) ||
        g.eventId.toLowerCase().includes(globalSearch.toLowerCase());
      const matchAlert = globalAlertLevel === 'All' || g.alertLevel === globalAlertLevel;
      const hazardDef = GDACS_HAZARD_DEFS.find((d) => d.id === globalHazardType);
      const matchHazard = globalHazardType === 'All' || (hazardDef ? hazardDef.matches(g.hazardType) : true);
      return matchSearch && matchAlert && matchHazard;
    })
      // Most severe first: Red → Orange → Green (feed order kept within a level).
      .sort((a, b) => (ALERT_RANK[a.alertLevel] ?? 9) - (ALERT_RANK[b.alertLevel] ?? 9));
  }, [globalDisasters, globalSearch, globalAlertLevel, globalHazardType]);

  // GDACS events are client-side (one feed); paged like the national list.
  const GLOBAL_PAGE_SIZE = 10;
  const globalPageCount = Math.max(1, Math.ceil(filteredGlobalDisasters.length / GLOBAL_PAGE_SIZE));
  const safeGlobalPage = Math.min(globalPage, globalPageCount - 1);
  const displayedGlobalDisasters = filteredGlobalDisasters.slice(
    safeGlobalPage * GLOBAL_PAGE_SIZE,
    (safeGlobalPage + 1) * GLOBAL_PAGE_SIZE
  );
  useEffect(() => {
    setGlobalPage(0);
  }, [globalSearch, globalAlertLevel, globalHazardType]);

  const availableGdacsHazards = useMemo(() => {
    const events = globalDisasters as GdacsEvent[];
    return GDACS_HAZARD_DEFS.filter((def) => events.some((g) => def.matches(g.hazardType)));
  }, [globalDisasters]);

  const gdacsHazardCounts = useMemo(() => {
    const events = globalDisasters as GdacsEvent[];
    const counts: Record<string, number> = { All: events.length };
    availableGdacsHazards.forEach((def) => {
      counts[def.id] = events.filter((g) => def.matches(g.hazardType)).length;
    });
    return counts;
  }, [globalDisasters, availableGdacsHazards]);

  // If the active hazard filter no longer has data, reset to All.
  useEffect(() => {
    if (globalHazardType !== 'All' && !availableGdacsHazards.some((d) => d.id === globalHazardType)) {
      setGlobalHazardType('All');
    }
  }, [availableGdacsHazards, globalHazardType]);

  const categoryCounts = dynamicDisasterTypes.reduce((acc, cat) => {
    const eligible =
      filterStatus === 'All'
        ? incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected')
        : incidents.filter((i) => i.status === filterStatus);
    acc[cat] = cat === 'All' ? eligible.length : eligible.filter((i) => i.type === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const handleEscalateGdacs = (gdacs: GdacsEvent) => {
    setNewTitle(`[GDACS] ${gdacs.title}`);
    setNewLocation(`${gdacs.country} (Regional Transboundary Monitoring)`);
    setNewState('Regional / Transboundary');
    setNewDistrict(gdacs.country);
    setNewLat(gdacs.lat != null ? String(gdacs.lat) : '');
    setNewLng(gdacs.lng != null ? String(gdacs.lng) : '');
    setNewSeverity(gdacs.alertLevel === 'Red' ? 'Critical' : gdacs.alertLevel === 'Orange' ? 'High' : 'Medium');
    setNewDisasterLevel('Level 3: Federal');
    setNewSourceType('Metrological / Sensor');
    setNewDescription(
      `Escalated from live GDACS Event ID: ${gdacs.eventId}\nSeverity metric: ${gdacs.severity}\nAffected population estimate: ${gdacs.affectedPopulation?.toLocaleString() || 'N/A'
      }\nSource portal: ${gdacs.link}\n\nSummary:\n${gdacs.description}`
    );
    setReportModalOpen(true);
  };

  useEffect(() => {
    if (!reportModalOpen) setPromotingPredictionId(null);
  }, [reportModalOpen]);

  const handlePromotePrediction = (prediction: any) => {
    setPromotingPredictionId(prediction.id ?? null);
    setNewTitle(`[Predicted] ${prediction.hazard_type || 'Disaster Hazard'} - ${prediction.district || 'Predicted Zone'}`);
    const matchedType = (['Flood', 'Flash Flood', 'Landslide', 'Severe Storm', 'Forest Fire', 'Haze', 'Earthquake', 'Drought'] as DisasterType[]).find(
      (t) => t.toLowerCase() === (prediction.hazard_type || '').toLowerCase()
    ) || 'Flood';
    setNewType(matchedType);
    setNewState(prediction.state || '');
    setNewDistrict(prediction.district || '');
    setNewLocation(prediction.district ? `${prediction.district}, ${prediction.state || ''}` : '');
    setNewLat(prediction.lat != null ? String(prediction.lat) : '');
    setNewLng(prediction.lng != null ? String(prediction.lng) : '');
    const score = Number(prediction.hazard_score) || 0;
    setNewSeverity(score >= 80 ? 'Critical' : score >= 60 ? 'High' : 'Medium');
    setNewDisasterLevel(score >= 80 ? 'Level 3: Federal' : score >= 60 ? 'Level 2: State' : 'Level 1: District');
    setNewSourceType('Metrological / Sensor');
    setNewDescription(prediction.advisory || `Stage-A automated prediction scan early-warning for ${prediction.district || 'the sector'}.`);
    // The prediction's exposed population is a model estimate, not a reported
    // figure, so the affected-population fact is left for the officer to enter.
    setNewAffected('');
    setPickerKey((k) => k + 1);
    setReportModalOpen(true);
  };

  const handleOpenEdit = (incident: Incident, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIncident(incident);
    setEditTitle(incident.title);
    setEditSeverity(incident.severity);
    setEditDisasterLevel(incident.disaster_level);
    setEditStatus(incident.status);
    setEditDescription(incident.description || '');
    setEditAffectedPopulation(incident.affected_population || 0);
    setEditCasualtiesCount(incident.casualties_count || 0);
    setEditInfrastructureDamage(incident.infrastructure_damage || 'None');
    setEditAccessibilityScore(incident.accessibility_score ?? 50);
    setEditWeatherCondition(incident.weather_condition || '');
    setEditExistingMedia(incident.media_urls || []);
    setEditMedia([]);
    setEditErrors({});
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncident) return;
    const errors: Record<string, string> = {};
    if (!editTitle.trim()) errors.title = 'Incident title is required';
    if (!editSeverity) errors.severity = 'Severity is required';
    if (!editDisasterLevel) errors.disasterLevel = 'Disaster level is required';
    if (!editDescription.trim()) errors.description = 'Operational notes / description is required';
    if (hasPendingUploads(editMedia)) errors.media = 'Wait for uploads to finish.';
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    try {
      await updateIncidentMutation.mutateAsync({
        id: editingIncident.id,
        updates: {
          title: editTitle,
          severity: editSeverity,
          disaster_level: editDisasterLevel,
          status: editStatus as any,
          description: editDescription,
          affected_population: Math.max(0, Math.round(Number(editAffectedPopulation) || 0)),
          casualties_count: Math.max(0, Math.round(Number(editCasualtiesCount) || 0)),
          infrastructure_damage: editInfrastructureDamage as any,
          accessibility_score: Number.isFinite(Number(editAccessibilityScore))
            ? Math.min(100, Math.max(0, Math.round(Number(editAccessibilityScore))))
            : editingIncident.accessibility_score,
          weather_condition: editWeatherCondition.trim() || undefined,
          // Existing attachments the officer kept + newly uploaded ones only.
          media_urls: [...editExistingMedia, ...uploadedRefs(editMedia)],
          field_verification: editedFieldVerification(editingIncident, {
            affected_population: Number(editAffectedPopulation),
            casualties_count: Number(editCasualtiesCount),
            infrastructure_damage: editInfrastructureDamage,
            accessibility_score: Number(editAccessibilityScore),
            weather_condition: editWeatherCondition.trim() || null,
            severity: editSeverity,
          }),
        },
      });
      const failed = editMedia.filter((m) => m.status === 'failed').length;
      toast.success('Incident facts updated. AI re-assessment runs automatically if impact facts changed.');
      if (failed) toast.error(`${failed} file(s) failed to upload and were not attached. The incident was saved.`);
      setEditModalOpen(false);
      setEditingIncident(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update incident');
    }
  };

  const handleOpenDelete = (incident: Incident, e: React.MouseEvent) => {
    e.stopPropagation();
    setIncidentToDelete(incident);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!incidentToDelete) return;
    try {
      await deleteIncidentMutation.mutateAsync(incidentToDelete.id);
      toast.success('Incident archived / removed successfully!');
      setDeleteModalOpen(false);
      setIncidentToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete incident');
    }
  };

  // Main Incident Creation Handler with Duplicate Detection
  const handleCreateIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newTitle.trim()) errors.title = 'Incident title is required';
    if (!newLocation.trim()) errors.location = 'Specific location / address is required';
    if (!newDescription.trim()) errors.description = 'Incident description is required';
    const latNum = parseFloat(newLat);
    const lngNum = parseFloat(newLng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      errors.location = 'Place the map pin on the incident location.';
    } else if (!locationResolution?.administrativeAreaId) {
      errors.district = 'Choose a canonical state and district (or move the pin inside Malaysia).';
    } else if (locationResolution.status === 'pending' || locationResolution.status === 'ambiguous') {
      errors.district = 'Wait for the location to resolve, or choose the correct district.';
    }
    const parseCount = (v: string) => (v.trim() === '' ? null : Number(v));
    const affected = parseCount(newAffected);
    const casualties = parseCount(newCasualties);
    const access = parseCount(newAccess);
    if (affected !== null && (!Number.isInteger(affected) || affected < 0)) errors.facts = 'Affected population must be a whole number.';
    if (casualties !== null && (!Number.isInteger(casualties) || casualties < 0)) errors.facts = 'Casualties must be a whole number.';
    if (access !== null && (!Number.isInteger(access) || access < 0 || access > 100)) errors.facts = 'Accessibility must be 0-100.';
    if (hasPendingUploads(newMedia)) errors.media = 'Wait for uploads to finish (or remove them).';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    // Unknown facts are sent with their schema default but explicitly marked
    // "unknown", so the analysis pipeline excludes them instead of treating
    // them as observed zeros.
    const fv: Partial<Record<FactField, FactState>> = {
      affected_population: affected === null ? 'unknown' : 'reported',
      casualties_count: casualties === null ? 'unknown' : 'reported',
      infrastructure_damage: newInfra === '' ? 'unknown' : 'reported',
      accessibility_score: access === null ? 'unknown' : 'reported',
      weather_condition: newWeatherCondition.trim() ? 'reported' : 'unknown',
      severity: 'reported',
    };

    const payload = {
      title: newTitle.trim(),
      type: newType,
      location: newLocation.trim(),
      state: locationResolution?.state || newState,
      // Precise place name (e.g. Mentakab); the backend re-resolves the canonical
      // administrative area from the coordinates and uses this id only as a hint.
      district: (locationResolution?.district || newDistrict).trim(),
      administrative_area_id: locationResolution?.administrativeAreaId ?? undefined,
      postcode: newPostcode.trim() || undefined,
      coordinates: [latNum, lngNum] as [number, number],
      severity: newSeverity,
      disaster_level: newDisasterLevel,
      occurred_at: new Date().toISOString(),
      // Channel the information came through. Verification is decided by the
      // backend from the signed-in role: an officer's own report is verified.
      source: SOURCE_LABEL[newSourceType],
      reporter_contact: newReporterContact || undefined,
      weather_condition: newWeatherCondition.trim() || undefined,
      description: newDescription.trim(),
      affected_population: affected ?? 0,
      casualties_count: casualties ?? 0,
      infrastructure_damage: (newInfra || 'None') as 'Severe' | 'Moderate' | 'Minor' | 'None',
      accessibility_score: access ?? 50,
      field_verification: fv,
      media_urls: uploadedRefs(newMedia),
    };

    // Step 1: Detect potential duplicate against active incidents
    const cleanNewLoc = newLocation.toLowerCase();
    const cleanNewDist = newDistrict.toLowerCase();
    const cleanNewState = newState.toLowerCase();

    const existingMatch = incidents.find((inc) => {
      if (inc.status === 'Resolved' || inc.status === 'Rejected') return false;
      const sameType = inc.type === newType;
      const sameState = inc.state.toLowerCase() === cleanNewState;
      const sameDistrict = inc.district.toLowerCase() === cleanNewDist;
      const locMatch =
        inc.location.toLowerCase().includes(cleanNewLoc) ||
        cleanNewLoc.includes(inc.location.toLowerCase());

      return sameType && sameState && (sameDistrict || locMatch);
    });

    if (existingMatch) {
      // Step 1.1: System detects potential duplicate and triggers review modal
      setDuplicateMatch(existingMatch);
      setPendingPayload(payload);
      setShowDuplicateModal(true);
      return;
    }

    // Direct creation if no duplicate
    await executeCreation(payload);
  };

  const executeCreation = async (payload: any) => {
    try {
      const created = await createIncidentMutation.mutateAsync(payload);
      // The prediction leaves the active list only once its incident really exists.
      if (promotingPredictionId && created?.id) {
        promotePrediction.mutate(
          { id: promotingPredictionId, incidentId: created.id },
          { onError: () => toast.error('Incident saved, but the prediction could not be marked as promoted; dismiss it manually.') }
        );
        setPromotingPredictionId(null);
      }
      const failedUploads = newMedia.filter((m) => m.status === 'failed').length;
      toast.success(
        created.analysis
          ? `Incident ${created.display_id} saved. AI analysis is ${created.analysis.status}” results will appear in Disaster Intelligence.`
          : `Incident ${created.display_id} saved. AI analysis could not be queued; you can request it from Disaster Intelligence.`
      );
      if (failedUploads) toast.error(`${failedUploads} file(s) failed to upload and were not attached. The incident itself was saved.`);
      setLastCreated(created);
      setReportModalOpen(false);
      setShowDuplicateModal(false);
      setDuplicateMatch(null);
      setPendingPayload(null);
      setNewTitle('');
      setNewLocation('');
      setNewDescription('');
      setNewWeatherCondition('');
      setNewAffected('');
      setNewCasualties('');
      setNewInfra('');
      setNewAccess('');
      setNewMedia([]);
      setNewLat('');
      setNewLng('');
      setNewState('');
      setNewDistrict('');
      setNewPostcode('');
      setLocationResolution(null);
      setPickerKey((k) => k + 1);
    } catch (err: any) {
      // The incident was NOT saved. Uploaded files stay listed so a retry reuses them.
      toast.error(`Incident was not saved: ${err.message || 'request failed'}. Your uploaded files are kept for retry.`);
    }
  };

  // Step 3.1: Confirm as Duplicate (Option A: Update existing incident)
  const handleDuplicateUpdateExisting = () => {
    if (!duplicateMatch) return;
    setShowDuplicateModal(false);
    setReportModalOpen(false);
    // Open edit modal on existing record
    setEditingIncident(duplicateMatch);
    setEditTitle(duplicateMatch.title);
    setEditSeverity(duplicateMatch.severity);
    setEditDisasterLevel(duplicateMatch.disaster_level);
    setEditStatus(duplicateMatch.status);
    setEditDescription(
      `${duplicateMatch.description}\n[Update]: Additional citizen report noted matching this event.`
    );
    setEditErrors({});
    setEditModalOpen(true);
    toast.info(`Updating existing incident ${duplicateMatch.display_id || duplicateMatch.id}`);
  };

  // Step 3.1: Confirm as Duplicate (Option B: Dismiss and return to incident management)
  const handleDuplicateConfirmAndReturn = () => {
    setShowDuplicateModal(false);
    setDuplicateMatch(null);
    setPendingPayload(null);
    setReportModalOpen(false);
    toast.info('Duplicate creation prevented. Returned to Incident Management.');
  };

  // Step 3.2: Determined different -> proceed with creating new incident
  const handleDuplicateProceedAsNew = async () => {
    if (pendingPayload) {
      await executeCreation(pendingPayload);
    }
  };

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-5">
      {/* Page Title + Description */}
      <motion.div variants={itemAnim}>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Incident Management</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          National EOC situational response registry &amp; Global GDACS early warning network
        </p>
      </motion.div>

      <motion.div
        variants={itemAnim}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl self-start">
          <button
            onClick={() => setViewScope('national')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewScope === 'national'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <ShieldAlert size={14} className={viewScope === 'national' ? 'text-blue-600' : 'text-slate-400'} />
            <span>National EOC</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${viewScope === 'national' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
            >
              {activeIncidentsCount}
            </span>
          </button>

          <button
            onClick={() => setViewScope('global')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewScope === 'global'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <Globe size={14} className={viewScope === 'global' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Global GDACS</span>
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-600 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Live
            </span>
          </button>
        </div>

        {/* Primary actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus size={15} />
            <span>Report New Incident</span>
          </button>
        </div>
      </motion.div>

      {/* VIEW 1: NATIONAL EOC INCIDENTS */}
      {viewScope === 'national' && (
        <>
          {/* Emerging Hazard Predictions Review Section */}
          <HazardPredictionsPanel onPromoteToIncident={handlePromotePrediction} />

          {/* Filter Bar */}
          <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search incidents by ID, title, or location..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <Filter size={14} className="text-slate-500" />
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Severity</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="All">Active Incidents</option>
                    <option value="Unverified">Unverified</option>
                    <option value="Verified">Verified</option>
                    <option value="Responding">Responding</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs scrollbar-none">
              {dynamicDisasterTypes.map((category) => {
                const isSelected = selectedCategory === category;
                const count = categoryCounts[category] || 0;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                  >
                    {typeIcons[category] && <span>{typeIcons[category]}</span>}
                    <span>{category}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Incidents List Grid */}
          {lastCreated && (
            <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-900">
              <span className="flex items-center gap-2">
                <BrainCircuit size={14} /> {lastCreated.display_id} saved” AI analysis runs in the background.
              </span>
              <span className="flex items-center gap-2">
                <button type="button" onClick={() => navigate(`/situational/intelligence?incidentId=${lastCreated.id}`)} className="font-bold underline cursor-pointer">
                  View in Disaster Intelligence
                </button>
                <button type="button" aria-label="Dismiss" onClick={() => setLastCreated(null)} className="cursor-pointer"><X size={13} /></button>
              </span>
            </div>
          )}
          {isLoading || (incidentPage.isLoading && !incidentPage.data) ? (
            <SkeletonList count={4} />
          ) : incidentPage.isError ? (
            <div className="bg-white border border-red-200 rounded-xl p-8 text-center text-red-700 text-sm">
              Incidents could not be loaded. <button className="underline cursor-pointer" onClick={() => incidentPage.refetch()}>Retry</button>
            </div>
          ) : displayedIncidents.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              <p className="text-sm font-semibold">No incidents found matching criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedIncidents.map((incident) => {
                  const isInactive = incident.status === 'Resolved' || incident.status === 'Rejected';
                  return (
                    <div
                      key={incident.id}
                      onClick={() => navigate(`/situational/incidents/${incident.id}`)}
                      className={`border rounded-xl p-5 transition-all cursor-pointer relative group flex flex-col justify-between ${isInactive
                        ? 'bg-slate-100/75 border-slate-300 text-slate-500 hover:border-slate-400'
                        : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-md'
                        }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${isInactive
                                ? 'text-slate-500 bg-slate-200/70 border-slate-300'
                                : 'text-slate-600 bg-slate-100 border-slate-200'
                                }`}
                            >
                              {getCleanDisplayId(incident.id, incident.display_id)}
                            </span>
                            <div className="flex items-center gap-1">
                              {statusIcons[incident.status]}
                              <span
                                className={`text-xs font-semibold ${isInactive ? 'text-slate-500' : 'text-slate-700'
                                  }`}
                              >
                                {incident.status}
                              </span>
                            </div>
                          </div>
                          <DisasterBadge type="severity" value={incident.severity} />
                        </div>

                        <h3
                          className={`text-sm font-bold leading-snug mb-1.5 transition-colors ${isInactive ? 'text-slate-600' : 'text-slate-900 group-hover:text-blue-600'
                            }`}
                        >
                          {incident.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <MapPin size={13} className="shrink-0 text-slate-400" />
                          <span className="truncate">
                            {formatFullLocation(incident.location, incident.district, incident.state, incident.administrative_district)}
                          </span>
                        </div>

                        {/* Citizen photo submissions thumbnail gallery */}
                        {incident.media_urls && incident.media_urls.length > 0 && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex -space-x-2 overflow-hidden">
                              {incident.media_urls.filter((u) => u.startsWith('http')).slice(0, 3).map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`Evidence ${idx + 1}`}
                                  className="inline-block h-10 w-14 rounded-md object-cover ring-2 ring-white border border-slate-200 shadow-2xs"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <ImageIcon size={10} />
                              {incident.media_urls.length} attachment{incident.media_urls.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        )}

                        {/* Source & Reporter attribution */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 flex items-center gap-1">
                            <RadioTower size={11} className="text-blue-500" />
                            <span>Source: {incident.source}</span>
                          </span>
                          {incident.reporter_name && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <User size={10} />
                              <span>
                                Reported by: <strong>{incident.reporter_name}</strong>
                              </span>
                            </span>
                          )}
                        </div>

                        <p
                          className={`text-xs line-clamp-2 leading-relaxed mb-4 ${isInactive ? 'text-slate-400' : 'text-slate-600'
                            }`}
                        >
                          {incident.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                        <div className="flex items-center gap-2">
                          <span>
                            Level: <strong className="text-slate-700">{incident.disaster_level.replace('Level ', 'L')}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(incident, e)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Incident"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenDelete(incident, e)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Archive / Delete Incident"
                          >
                            <Trash2 size={13} />
                          </button>
                          <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform ml-1">
                            View <ChevronRight size={13} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              <PaginationBar
                pageIndex={incidentPage.pageIndex}
                pageCount={incidentPage.pageCount}
                total={incidentPage.total}
                pageSize={incidentPage.pageSize}
                onPageChange={incidentPage.setPageIndex}
                isFetching={incidentPage.isFetching}
                label="incidents"
              />
            </div>
          )}
        </>
      )}

      {/* VIEW 2: GLOBAL GDACS LIVE DISASTERS FEED */}
      {viewScope === 'global' && (
        <div className="space-y-4">
          {/* Global Filter & Telemetry HUD */}
          <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            {/* Unified search + alert filter row */}
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search by country, event title, or hazard type..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 shrink-0">
                <Filter size={13} className="text-slate-400" />
                <select
                  value={globalAlertLevel}
                  onChange={(e) => setGlobalAlertLevel(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="All">All Alerts</option>
                  <option value="Red">Red (Severe)</option>
                  <option value="Orange">Orange (Warning)</option>
                  <option value="Green">Green (Advisory)</option>
                </select>
              </div>

              <button
                onClick={() => refetchGlobal()}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                title="Refresh Live GDACS Telemetry"
              >
                <RefreshCw size={12} className={isGlobalFetching ? 'animate-spin text-blue-600' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs scrollbar-none">
              {[{ id: 'All', label: 'All', icon: <Globe size={14} className="text-slate-500" /> }, ...availableGdacsHazards].map(
                (h) => {
                  const isSelected = globalHazardType === h.id;
                  const count = gdacsHazardCounts[h.id] ?? 0;
                  return (
                    <button
                      key={h.id}
                      onClick={() => setGlobalHazardType(h.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                    >
                      <span>{h.icon}</span>
                      <span>{h.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Quick Status Bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1.5 font-medium">
                <Globe size={13} className="text-blue-600" />
                Live GDACS Network” {filteredGlobalDisasters.length} Monitored Events
              </span>
            </div>
          </motion.div>

          {/* Global Disaster Cards Grid */}
          {isGlobalLoading ? (
            <SkeletonList count={4} />
          ) : filteredGlobalDisasters.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              <Globe size={32} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-semibold">No global disaster events match your search criteria.</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting hazard type or alert level filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedGlobalDisasters.map((gEvent) => {
                  const isRed = gEvent.alertLevel === 'Red';
                  const isOrange = gEvent.alertLevel === 'Orange';

                  return (
                    <div
                      key={gEvent.id}
                      className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${isRed
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : isOrange
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                            >
                              {gEvent.eventId}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isRed
                                ? 'bg-red-600 text-white'
                                : isOrange
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-600 text-white'
                                }`}
                            >
                              {gEvent.alertLevel} Alert
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            <span>{gEvent.date ? new Date(gEvent.date).toLocaleDateString() : 'N/A'}</span>
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1.5 group-hover:text-blue-600 transition-colors">
                          {gEvent.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <MapPin size={13} className="shrink-0 text-slate-400" />
                          <span>
                            {gEvent.country} ({gEvent.hazardType})
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">{gEvent.description}</p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-4">
                          <div className="flex-1">
                            <span className="text-slate-400 block text-[10px]">Severity Metric</span>
                            <span className="font-bold text-slate-700">{gEvent.severity}</span>
                          </div>
                          <div className="flex-1 border-l border-slate-200 pl-2.5">
                            <span className="text-slate-400 block text-[10px]">Affected Population</span>
                            <span className="font-bold text-slate-700">
                              {gEvent.affectedPopulation ? `${gEvent.affectedPopulation.toLocaleString()}` : 'Telemetry pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <a
                          href={gEvent.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
                        >
                          <ExternalLink size={13} />
                          <span>GDACS Portal</span>
                        </a>

                        <button
                          onClick={() => handleEscalateGdacs(gEvent)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus size={13} />
                          <span>Escalate to National EOC</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {/* Global pagination */}
              {filteredGlobalDisasters.length > GLOBAL_PAGE_SIZE && (
                <PaginationBar
                  pageIndex={safeGlobalPage}
                  pageCount={globalPageCount}
                  total={filteredGlobalDisasters.length}
                  pageSize={GLOBAL_PAGE_SIZE}
                  onPageChange={setGlobalPage}
                  isFetching={false}
                  label="global events"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Report Incident Modal */}
      <AnimatePresence>
        {reportModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
            onClick={() => setReportModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Report New Disaster Incident</h3>
                    <p className="text-[10px] text-slate-400">National Emergency Operations Center (EOC) Dispatch</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateIncidentSubmit} noValidate className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Incident Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => {
                      setNewTitle(e.target.value);
                      if (formErrors.title) setFormErrors((p) => ({ ...p, title: '' }));
                    }}
                    placeholder="e.g. Flash Flooding at Jalan Merbau Residential Sector"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${formErrors.title ? 'border-red-500' : 'border-slate-200 focus:border-blue-600'
                      }`}
                  />
                  {formErrors.title && (
                    <span className="text-red-500 text-xs mt-1 block">{formErrors.title}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Disaster Type <span className="text-red-500">*</span></label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as DisasterType)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="Flood">Flood</option>
                      <option value="Flash Flood">Flash Flood</option>
                      <option value="Landslide">Landslide</option>
                      <option value="Forest Fire">Forest Fire / Wildfire</option>
                      <option value="Severe Storm">Severe Storm</option>
                      <option value="Haze">Haze</option>
                      <option value="Earthquake">Earthquake</option>
                      <option value="Drought">Drought</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Information channel<span className="text-red-500">*</span></label>
                    <select
                      value={newSourceType}
                      onChange={(e) => setNewSourceType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="Agency Patrol">Agency patrol / field team</option>
                      <option value="Emergency 999">Emergency 999 call</option>
                      <option value="Citizen Reported">Citizen (phone / walk-in)</option>
                      <option value="Metrological / Sensor">Sensor alert (JPS / MET)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Severity<span className="text-red-500">*</span></label>
                    <select
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as SeverityLevel)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="Critical">Critical (Life Threatening)</option>
                      <option value="High">High (Major Inundation)</option>
                      <option value="Medium">Medium (Moderate Risk)</option>
                      <option value="Low">Low (Advisory)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Disaster Level <span className="text-red-500">*</span></label>
                    <select
                      value={newDisasterLevel}
                      onChange={(e) => setNewDisasterLevel(e.target.value as DisasterLevel)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="Level 1: District">Level 1: District</option>
                      <option value="Level 2: State">Level 2: State</option>
                      <option value="Level 3: Federal">Level 3: Federal</option>
                    </select>
                  </div>
                </div>

                {/* Integrated Malaysia Location & Interactive Map Picker */}
                <div className="pt-2 border-t border-slate-100">
                  <MalaysiaLocationPicker
                    key={pickerKey}
                    onResolutionChange={setLocationResolution}
                    state={newState}
                    onStateChange={setNewState}
                    district={newDistrict}
                    onDistrictChange={(d) => {
                      setNewDistrict(d);
                      if (formErrors.district) setFormErrors((p) => ({ ...p, district: '' }));
                    }}
                    postcode={newPostcode}
                    onPostcodeChange={setNewPostcode}
                    location={newLocation}
                    onLocationChange={(l) => {
                      setNewLocation(l);
                      if (formErrors.location) setFormErrors((p) => ({ ...p, location: '' }));
                    }}
                    lat={newLat}
                    onLatChange={setNewLat}
                    lng={newLng}
                    onLngChange={setNewLng}
                  />
                  {formErrors.location && (
                    <span className="text-red-500 text-xs mt-1 block">{formErrors.location}</span>
                  )}
                  {formErrors.district && (
                    <span className="text-red-500 text-xs mt-1 block">{formErrors.district}</span>
                  )}
                  {formErrors.postcode && (
                    <span className="text-red-500 text-xs mt-1 block">{formErrors.postcode}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PhoneInput
                    value={newReporterContact}
                    onChange={setNewReporterContact}
                    label="Reporter Contact"
                    placeholder="+60-12-3456 7890"
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800">
                        Observed Weather
                      </label>
                      {weatherAutoLoaded && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Auto-Detected
                        </span>
                      )}
                      {fetchingWeather && (
                        <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" /> Fetching weather
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={newWeatherCondition}
                      onChange={(e) => {
                        setNewWeatherCondition(e.target.value);
                        setWeatherAutoLoaded(false); 
                      }}
                      placeholder="e.g. Heavy Rain· 28°C· Wind 22 km/h"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <p className="text-xs font-bold text-slate-800">
                    Reported impact facts <span className="text-[10px] text-slate-500 font-normal">(optional)</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <label className="text-[11px] text-slate-600">Affected people
                      <input type="number" min={0} value={newAffected} onChange={(e) => setNewAffected(e.target.value)} placeholder="Unknown" className="mt-0.5 w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md" />
                    </label>
                    <label className="text-[11px] text-slate-600">Casualties
                      <input type="number" min={0} value={newCasualties} onChange={(e) => setNewCasualties(e.target.value)} placeholder="Unknown" className="mt-0.5 w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md" />
                    </label>
                    <label className="text-[11px] text-slate-600">Infrastructure damage
                      <select value={newInfra} onChange={(e) => setNewInfra(e.target.value as typeof newInfra)} className="mt-0.5 w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md">
                        <option value="">Unknown</option><option>None</option><option>Minor</option><option>Moderate</option><option>Severe</option>
                      </select>
                    </label>
                    <label className="text-[11px] text-slate-600">Road accessibility 0-100
                      <input type="number" min={0} max={100} value={newAccess} onChange={(e) => setNewAccess(e.target.value)} placeholder="Unknown" className="mt-0.5 w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md" />
                    </label>
                  </div>
                  {formErrors.facts && <span className="text-red-500 text-xs block">{formErrors.facts}</span>}
                </div>

                <MediaUploader items={newMedia} onChange={setNewMedia} disabled={createIncidentMutation.isPending} />
                {formErrors.media && <span className="text-red-500 text-xs block">{formErrors.media}</span>}

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Description / Observations <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => {
                      setNewDescription(e.target.value);
                      if (formErrors.description) setFormErrors((p) => ({ ...p, description: '' }));
                    }}
                    placeholder="Describe water levels, trapped civilians, road access conditions, evacuation center needs..."
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${formErrors.description ? 'border-red-500' : 'border-slate-200 focus:border-blue-600'
                      }`}
                  />
                  {formErrors.description && (
                    <span className="text-red-500 text-xs mt-1 block">{formErrors.description}</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createIncidentMutation.isPending}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    {createIncidentMutation.isPending ? 'Submitting Report...' : 'Submit Incident Report'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: DUPLICATE INCIDENT DETECTED REVIEW MODAL (Specification Flows 1.1 -> 3.2) */}
      <AnimatePresence>
        {showDuplicateModal && duplicateMatch && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowDuplicateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-amber-300 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-amber-500 text-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-900 text-white flex items-center justify-center font-bold shadow-xs">
                    <AlertTriangle size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight">Potential Duplicate Incident Detected</h3>
                    <p className="text-[11px] font-medium text-slate-950/80">
                      An active {duplicateMatch.type} record already exists in {duplicateMatch.district}, {duplicateMatch.state}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="p-1 rounded-lg text-slate-950/60 hover:text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold mb-1">Disaster Management Authority Duplicate Review Protocol:</p>
                  <p>
                    The system detected an existing active incident record that closely matches your submission location and disaster type.
                    Please review both records below and choose whether to consolidate updates into the existing incident, cancel this submission, or proceed as a distinct new disaster event.
                  </p>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Existing Active Incident */}
                  <div className="bg-slate-50 border-2 border-amber-300/80 rounded-xl p-4 space-y-2.5 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        Existing Active Record
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {duplicateMatch.display_id || duplicateMatch.id}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{duplicateMatch.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span>{duplicateMatch.location}, {duplicateMatch.district}, {duplicateMatch.state}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 text-xs">
                      <DisasterBadge type="severity" value={duplicateMatch.severity} />
                      <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {duplicateMatch.status}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono ml-auto">
                        Level: {duplicateMatch.disaster_level.replace('Level ', 'L')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 bg-white p-2 rounded-lg border border-slate-200/80 text-[11px]">
                      {duplicateMatch.description}
                    </p>

                    <div className="text-[10px] text-slate-400 font-medium">
                      Reported by: <strong>{duplicateMatch.reporter_name || 'Field Team'}</strong> ({duplicateMatch.source || duplicateMatch.source})
                    </div>
                  </div>

                  {/* Right: New Submission */}
                  <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                        New Submission (Proposed)
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-600">INC-PENDING</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{newTitle}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                        <MapPin size={12} className="text-blue-500 shrink-0" />
                        <span>{[newLocation, newDistrict, newState].filter(Boolean).join(', ')}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-blue-100 text-xs">
                      <DisasterBadge type="severity" value={newSeverity} />
                      <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        Verified on submit
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono ml-auto">
                        Level: {newDisasterLevel.replace('Level ', 'L')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 bg-white p-2 rounded-lg border border-blue-100 text-[11px]">
                      {newDescription || 'No description entered.'}
                    </p>

                    <div className="text-[10px] text-slate-400 font-medium">
                      Reporter: <strong>{user?.name || 'Current Officer'}</strong> ({newSourceType})
                    </div>
                  </div>
                </div>

                {/* Actions Grid (Specification Flow 2.1, 3.1, 3.2) */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleDuplicateConfirmAndReturn}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Confirm Duplicate (Cancel &amp; Return)
                  </button>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleDuplicateUpdateExisting}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Edit3 size={13} />
                      <span>Update Existing Incident</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDuplicateProceedAsNew}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Proceed as New Incident</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: QUICK EDIT INCIDENT MODAL */}
      <AnimatePresence>
        {editModalOpen && editingIncident && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setEditModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 size={16} className="text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Update Incident Record</h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {editingIncident.display_id || editingIncident.id}· {editingIncident.type}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} noValidate className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Incident Title <span className="!text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value);
                      if (editErrors.title) setEditErrors({});
                    }}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${editErrors.title ? 'border-red-500' : 'border-slate-200 focus:border-blue-600'
                      }`}
                  />
                  {editErrors.title && (
                    <span className="text-red-500 text-xs mt-1 block">{editErrors.title}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Severity <span className="!text-red-500">*</span></label>
                    <select
                      value={editSeverity}
                      onChange={(e) => {
                        setEditSeverity(e.target.value as SeverityLevel);
                        if (editErrors.severity) setEditErrors((p) => ({ ...p, severity: '' }));
                      }}
                      className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white cursor-pointer ${editErrors.severity ? 'border-red-500' : 'border-slate-200 focus:border-blue-600'
                        }`}
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    {editErrors.severity && (
                      <span className="text-red-500 text-xs mt-1 block">{editErrors.severity}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Disaster Level (Directive 20) <span className="!text-red-500">*</span></label>
                    <select
                      value={editDisasterLevel}
                      onChange={(e) => {
                        setEditDisasterLevel(e.target.value as DisasterLevel);
                        if (editErrors.disasterLevel) setEditErrors((p) => ({ ...p, disasterLevel: '' }));
                      }}
                      className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white cursor-pointer ${editErrors.disasterLevel ? 'border-red-500' : 'border-slate-200 focus:border-blue-600'
                        }`}
                    >
                      <option value="Level 1: District">Level 1: District</option>
                      <option value="Level 2: State">Level 2: State</option>
                      <option value="Level 3: Federal">Level 3: Federal</option>
                    </select>
                    {editErrors.disasterLevel && (
                      <span className="text-red-500 text-xs mt-1 block">{editErrors.disasterLevel}</span>
                    )}
                  </div>
                </div>

                {/* Impact Assessment Section (Updated by Disaster Management Authority) */}
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-2">
                    Official Impact Assessment Metrics
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Impacted Population</label>
                      <input
                        type="number"
                        min={0}
                        value={editAffectedPopulation}
                        onChange={(e) => setEditAffectedPopulation(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Confirmed Casualties</label>
                      <input
                        type="number"
                        min={0}
                        value={editCasualtiesCount}
                        onChange={(e) => setEditCasualtiesCount(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Infrastructure Risk</label>
                      <select
                        value={editInfrastructureDamage}
                        onChange={(e) => setEditInfrastructureDamage(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                      >
                        <option value="None">None</option>
                        <option value="Minor">Minor</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Severe">Severe</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Access Score (0 - 100)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editAccessibilityScore}
                        onChange={(e) => setEditAccessibilityScore(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Operational Notes / Description <span className="!text-red-500">*</span></label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => {
                      setEditDescription(e.target.value);
                      if (editErrors.description) setEditErrors((p) => ({ ...p, description: '' }));
                    }}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white ${editErrors.description ? 'border-red-500' : 'border-slate-200 focus:border-blue-600'
                      }`}
                  />
                  {editErrors.description && (
                    <span className="text-red-500 text-xs mt-1 block">{editErrors.description}</span>
                  )}
                </div>

                <MediaUploader
                  items={editMedia}
                  onChange={setEditMedia}
                  existingRefs={editExistingMedia}
                  onRemoveExisting={(ref) => setEditExistingMedia((prev) => prev.filter((r) => r !== ref))}
                  disabled={updateIncidentMutation.isPending}
                />
                {editErrors.media && <span className="text-red-500 text-xs block">{editErrors.media}</span>}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateIncidentMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    {updateIncidentMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: DELETE / ARCHIVE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteModalOpen && incidentToDelete && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setDeleteModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Archive / Remove Incident</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Are you sure you want to remove <strong>{incidentToDelete.title}</strong> (
                    <span className="font-mono">{incidentToDelete.display_id || incidentToDelete.id}</span>
                    )? This will remove it from active national EOC operational dashboards.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteIncidentMutation.isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 cursor-pointer"
                  >
                    {deleteIncidentMutation.isPending ? 'Archiving...' : 'Confirm Archive'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default IncidentManagement;
