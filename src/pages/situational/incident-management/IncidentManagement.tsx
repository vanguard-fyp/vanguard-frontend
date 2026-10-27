import { incidentTypeForHazard } from '../../../utils/hazardType';
import { predictionToDraft } from '../../../utils/predictionDraft';
import type { HazardPrediction } from '../../../types/intelligence';
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  ChevronRight,
  Plus,
  X,
  Globe,
  RefreshCw,
  ExternalLink,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Loader2,
  BrainCircuit,
  Siren,
  PencilLine,
  CopyCheck,
  Archive,
} from 'lucide-react';
import { Tag, TONE, SEVERITY_TONE, ALERT_TONE, LevelTag, SourceTag, StatusTag } from '../../../components/ui/shared/Tag';
import { useIncidents, useCreateIncident, useUpdateIncident, useDeleteIncident, useGlobalIncidents, usePromotePrediction, useIncidentMedia } from '../../../hooks';
import { PaginationBar } from '../../../components/ui/shared/PaginationBar';
import { MediaUploader, hasPendingUploads, uploadedRefs, type MediaItem } from '../../../components/ui/shared/MediaUploader';
import type { LocationResolution } from '../../../components/ui/shared/MalaysiaLocationPicker';
import { SkeletonList } from '../../../components/ui/shared/SkeletonLoader';
import { useToast } from '../../../context/ToastContext';
import { MalaysiaLocationPicker } from '../../../components/ui/shared/MalaysiaLocationPicker';
import { PhoneInput } from '../../../components/ui/shared/PhoneInput';
import { FormModal, ConfirmModal, Field, FormSection, GhostButton, PrimaryButton, inputCls } from '../../../components/ui/shared/Modal';
import { EarlyWarningsTrigger, HazardPredictionsDrawer } from '../../../components/ui/situational/HazardPredictionsPanel';
import { formatFullLocation } from '../../../utils/locationFormatter';
import { editedFieldVerification } from '../../../utils/facts';
import type { DisasterType, SeverityLevel, DisasterLevel, GdacsEvent, IncidentManagementProps, Incident, FactField, FactState } from '../../../types';
import { GDACS_HAZARD_DEFS, typeIcons } from '../../../constants/situational';
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

/** Cards settle into place as search and filters change the list. */
const CARD_MOTION = {
  layout: 'position' as const,
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

const IncidentManagement: React.FC<IncidentManagementProps> = () => {
  const [warningsOpen, setWarningsOpen] = useState(false);
  const navigate = useNavigate();

  const toast = useToast();
  const {
    data: incidents = [],
    isLoading: isIncidentsLoading,
    isError: isIncidentsError,
    refetch: refetchIncidents,
  } = useIncidents();

  // Scope Switcher: National EOC DB vs Global Live GDACS
  const [viewScope, setViewScope] = useState<'national' | 'global'>('national');

  // Only fetch external GDACS feed if the officer activates the Global view
  const {
    data: globalDisasters = [],
    isLoading: isGlobalLoading,
    refetch: refetchGlobal,
    isFetching: isGlobalFetching,
  } = useGlobalIncidents(false, { enabled: viewScope === 'global' });

  const createIncidentMutation = useCreateIncident();
  const updateIncidentMutation = useUpdateIncident();
  const deleteIncidentMutation = useDeleteIncident();

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
  // Pre-filled coordinates (prediction / alert) are resolved as soon as the form opens.
  const [resolveOnOpen, setResolveOnOpen] = useState(false);
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

  // Saved attachments shown as thumbnails in the update form (signed URLs).
  const { data: editMediaResolved = [] } = useIncidentMedia(editingIncident?.id, editModalOpen && (editingIncident?.media_urls?.length ?? 0) > 0);
  const editPreviews = useMemo(
    () => Object.fromEntries(editMediaResolved.filter((m) => m.status === 'available' && m.url).map((m) => [m.ref, { url: m.url as string, kind: m.kind }])),
    [editMediaResolved]
  );

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
    // Only include disaster types that actually exist in the current eligible incidents
    const eligible =
      filterStatus === 'All'
        ? incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected' && i.status !== 'Archived')
        : incidents.filter((i) => i.status === filterStatus);
    const typesInDb = Array.from(new Set(eligible.map((i) => i.type))).filter((t): t is DisasterType => Boolean(t));
    typesInDb.sort((a, b) => a.localeCompare(b));
    return ['All', ...typesInDb];
  }, [incidents, filterStatus]);

  useEffect(() => {
    if (selectedCategory !== 'All' && !dynamicDisasterTypes.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [dynamicDisasterTypes, selectedCategory]);

  // Client-side filtering: instant 0ms latency with zero network round-trip overhead
  const [nationalPage, setNationalPage] = useState(0);
  const NATIONAL_PAGE_SIZE = 10;

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // Status filter
      if (filterStatus === 'All') {
        if (incident.status === 'Resolved' || incident.status === 'Rejected' || incident.status === 'Archived') {
          return false;
        }
      } else if (incident.status !== filterStatus) {
        return false;
      }

      // Severity filter
      if (filterSeverity !== 'All' && incident.severity !== filterSeverity) {
        return false;
      }

      // Category / Disaster type filter
      if (selectedCategory !== 'All' && incident.type !== selectedCategory) {
        return false;
      }

      // Search query filter (matches title, location, district, state, display_id, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (incident.title || '').toLowerCase().includes(q);
        const matchLocation = (incident.location || '').toLowerCase().includes(q);
        const matchDistrict = (incident.district || '').toLowerCase().includes(q);
        const matchState = (incident.state || '').toLowerCase().includes(q);
        const matchDisplayId = (incident.display_id || incident.id || '').toLowerCase().includes(q);
        const matchDesc = (incident.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchLocation && !matchDistrict && !matchState && !matchDisplayId && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, filterStatus, filterSeverity, selectedCategory, searchQuery]);

  // Reset to first page when any filter or search changes
  useEffect(() => {
    setNationalPage(0);
  }, [filterSeverity, filterStatus, selectedCategory, searchQuery]);

  const nationalPageCount = Math.max(1, Math.ceil(filteredIncidents.length / NATIONAL_PAGE_SIZE));
  const safeNationalPage = Math.min(nationalPage, nationalPageCount - 1);
  const displayedIncidents = useMemo(() => {
    const start = safeNationalPage * NATIONAL_PAGE_SIZE;
    return filteredIncidents.slice(start, start + NATIONAL_PAGE_SIZE);
  }, [filteredIncidents, safeNationalPage]);
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
        ? incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected' && i.status !== 'Archived')
        : incidents.filter((i) => i.status === filterStatus);
    acc[cat] = cat === 'All' ? eligible.length : eligible.filter((i) => i.type === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const handleEscalateGdacs = (gdacs: GdacsEvent) => {
    setPromotingPredictionId(null);
    setNewTitle(`[GDACS] ${gdacs.title}`);
    // Disaster type follows the GDACS hazard (cyclone → Severe Storm, wildfire → Forest Fire, …).
    setNewType(incidentTypeForHazard(gdacs.hazardType));
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
    // GDACS population is a regional model estimate, not a reported count.
    setNewAffected('');
    setNewCasualties('');
    setResolveOnOpen(gdacs.lat != null && gdacs.lng != null);
    setPickerKey((k) => k + 1);
    setReportModalOpen(true);
  };

  useEffect(() => {
    if (!reportModalOpen) setPromotingPredictionId(null);
  }, [reportModalOpen]);

  const handlePromotePrediction = (prediction: HazardPrediction) => {
    // Everything the prediction carries is pre-filled; the officer reviews and submits.
    const d = predictionToDraft(prediction);
    setPromotingPredictionId(prediction.id ?? null);
    setNewTitle(d.title);
    setNewType(d.type);
    setNewState(d.state);
    setNewDistrict(d.district);
    setNewPostcode('');
    setNewLocation(d.location);
    setNewLat(d.lat);
    setNewLng(d.lng);
    setNewSeverity(d.severity);
    setNewDisasterLevel(d.level);
    setNewSourceType('Metrological / Sensor');
    setNewWeatherCondition(d.weather);
    setNewDescription(d.description);
    // Modelled figures (exposed population) are in the description, never in the
    // reported facts; casualties / damage / access are for the officer to confirm.
    setNewAffected('');
    setNewCasualties('');
    setNewInfra('');
    setNewAccess('');
    setResolveOnOpen(!!d.lat && !!d.lng);
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

  // Report form: show a field only when it applies.
  const hasPin = Number.isFinite(parseFloat(newLat)) && Number.isFinite(parseFloat(newLng));
  const needsReporterContact = newSourceType === 'Citizen Reported' || newSourceType === 'Emergency 999' || !!newReporterContact;
  const prefillSource = promotingPredictionId ? 'an early warning' : newTitle.startsWith('[GDACS]') ? 'a GDACS event' : null;
  const editImpactChanged = !!editingIncident && (
    editAffectedPopulation !== (editingIncident.affected_population || 0) ||
    editCasualtiesCount !== (editingIncident.casualties_count || 0) ||
    editInfrastructureDamage !== (editingIncident.infrastructure_damage || 'None') ||
    editAccessibilityScore !== (editingIncident.accessibility_score ?? 50)
  );

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-5">
      {/* Page title + primary action */}
      <motion.div variants={itemAnim} className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Incident Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Malaysia's incident register and the global GDACS alert feed.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Forecast hazards that are not incidents yet: opened in a side drawer */}
          <EarlyWarningsTrigger onClick={() => setWarningsOpen(true)} active={warningsOpen} />
          <button
            onClick={() => {
              setResolveOnOpen(false);
              setReportModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Report Incident</span>
          </button>
        </div>
      </motion.div>

      <HazardPredictionsDrawer open={warningsOpen} onClose={() => setWarningsOpen(false)} onPromoteToIncident={handlePromotePrediction} />

      {/* Scope */}
      <motion.div variants={itemAnim}>
        <div role="tablist" aria-label="Incident scope" className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
          {([
            {
              key: 'national', label: 'National EOC', extra: (on: boolean) => (
                <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums flex items-center justify-center ${on ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-500'}`}>{activeIncidentsCount}</span>
              )
            },
            {
              key: 'global', label: 'Global GDACS', extra: (on: boolean) => (
                <span className={`h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${on ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-500'}`}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: on ? TONE.blue : '#94a3b8' }} />Live
                </span>
              )
            },
          ] as const).map(({ key, label, extra }) => {
            const on = viewScope === key;
            return (
              <button key={key} role="tab" aria-selected={on} onClick={() => setViewScope(key)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {on && <motion.span layoutId="incident-scope" className="absolute inset-0 bg-white rounded-md shadow-[0_1px_2px_rgba(15,23,42,.08)]" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} />}
                <span className="relative">{label}</span>
                <span className="relative">{extra(on)}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* VIEW 1: NATIONAL EOC INCIDENTS */}
      {viewScope === 'national' && (
        <>
          {/* Filter bar */}
          <motion.div variants={itemAnim} className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, title or location"
                  className="w-full pl-9 pr-4 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-blue-600/10 transition"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  aria-label="Severity"
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-300 cursor-pointer"
                >
                  <option value="All">All severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Status"
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-300 cursor-pointer"
                >
                  <option value="All">Active incidents</option>
                  <option value="Unverified">Unverified</option>
                  <option value="Verified">Verified</option>
                  <option value="Responding">Responding</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Disaster types */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {dynamicDisasterTypes.map((category) => {
                const isSelected = selectedCategory === category;
                const count = categoryCounts[category] || 0;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${isSelected
                      ? 'bg-[#1e293b] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                  >
                    {typeIcons[category] && <span className="opacity-80">{typeIcons[category]}</span>}
                    <span>{category}</span>
                    <span className={`tabular-nums ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {lastCreated && (
            <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-xs" style={{ background: `${TONE.blue}0f`, color: '#1e3a8a' }}>
              <span className="flex items-center gap-2">
                <BrainCircuit size={14} /> {lastCreated.display_id} saved. AI analysis is running in the background.
              </span>
              <span className="flex items-center gap-3">
                <button type="button" onClick={() => navigate(`/situational/intelligence?incidentId=${lastCreated.id}`)} className="font-semibold text-blue-700 hover:text-blue-900 cursor-pointer">
                  View in Disaster Intelligence
                </button>
                <button type="button" aria-label="Dismiss" onClick={() => setLastCreated(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={14} /></button>
              </span>
            </div>
          )}

          {/* Incident cards */}
          {(isIncidentsLoading && incidents.length === 0) ? (
            <SkeletonList count={4} />
          ) : isIncidentsError ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-sm text-slate-600">
              Incidents could not be loaded. <button className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => refetchIncidents()}>Retry</button>
            </div>
          ) : displayedIncidents.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No incidents match these filters</p>
              <p className="text-xs text-slate-400 mt-1">Try another severity, status or disaster type.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout" initial={false}>
                  {displayedIncidents.map((incident) => {
                    const isInactive = incident.status === 'Resolved' || incident.status === 'Rejected';
                    const photos = (incident.media_urls ?? []).filter((u) => u.startsWith('http'));
                    const open = () => navigate(`/situational/incidents/${incident.id}`);
                    return (
                      <motion.article
                        key={incident.id}
                        {...CARD_MOTION}
                        role="link"
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
                        className={`group rounded-2xl border p-5 flex flex-col gap-3 cursor-pointer transition-[border-color,box-shadow] duration-200
                        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600
                        ${isInactive ? 'bg-slate-50 border-slate-200/80 opacity-80' : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-[0_10px_28px_-16px_rgba(15,23,42,.35)]'}`}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Tag tone={SEVERITY_TONE[incident.severity] ?? 'slate'}>{incident.severity}</Tag>
                          <StatusTag status={incident.status} />
                          <span className="ml-auto text-[11px] font-semibold text-slate-400 tabular-nums">
                            {getCleanDisplayId(incident.id, incident.display_id)}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                            {incident.title}
                          </h3>
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700 min-w-0">
                            <MapPin size={13} className="shrink-0" style={{ color: TONE.blue }} />
                            <span className="truncate">
                              {formatFullLocation(incident.location, incident.district, incident.state, incident.administrative_district)}
                            </span>
                          </p>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{(incident.description ?? '').replace(/\*\*|__|#+\s/g, '')}</p>

                        {photos.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {photos.slice(0, 3).map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`Evidence ${idx + 1}`}
                                  className="h-9 w-12 rounded-md object-cover ring-2 ring-white"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <ImageIcon size={12} className="text-slate-400" />
                              {incident.media_urls!.length} attachment{incident.media_urls!.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        )}

                        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-1.5">
                            <LevelTag level={incident.disaster_level} />
                            <SourceTag source={incident.source} reporter={incident.reporter_name} />
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(incident, e)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit incident"
                              aria-label="Edit incident"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenDelete(incident, e)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Archive or delete incident"
                              aria-label="Archive or delete incident"
                            >
                              <Trash2 size={13} />
                            </button>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all ml-0.5" />
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              <PaginationBar
                pageIndex={safeNationalPage}
                pageCount={nationalPageCount}
                total={filteredIncidents.length}
                pageSize={NATIONAL_PAGE_SIZE}
                onPageChange={setNationalPage}
                isFetching={false}
                label="incidents"
              />
            </div>
          )}
        </>
      )}

      {/* VIEW 2: GLOBAL GDACS LIVE DISASTERS FEED */}
      {viewScope === 'global' && (
        <div className="space-y-4">
          {/* Filters */}
          <motion.div variants={itemAnim} className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search by country, event or hazard"
                  className="w-full pl-9 pr-4 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-blue-600/10 transition"
                />
              </div>
              <select
                value={globalAlertLevel}
                onChange={(e) => setGlobalAlertLevel(e.target.value)}
                aria-label="Alert level"
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-300 cursor-pointer"
              >
                <option value="All">All alerts</option>
                <option value="Red">Red (severe)</option>
                <option value="Orange">Orange (warning)</option>
                <option value="Green">Green (advisory)</option>
              </select>
              <button
                onClick={() => refetchGlobal()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Refresh the GDACS feed"
              >
                <RefreshCw size={13} className={isGlobalFetching ? 'animate-spin text-blue-600' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {[{ id: 'All', label: 'All', icon: <Globe size={13} /> }, ...availableGdacsHazards].map((h) => {
                const isSelected = globalHazardType === h.id;
                const count = gdacsHazardCounts[h.id] ?? 0;
                return (
                  <button
                    key={h.id}
                    onClick={() => setGlobalHazardType(h.id)}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${isSelected
                      ? 'bg-[#1e293b] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                  >
                    <span className="opacity-80">{h.icon}</span>
                    <span>{h.label}</span>
                    <span className="tabular-nums text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              {filteredGlobalDisasters.length} events monitored by GDACS
            </p>
          </motion.div>

          {/* Global event cards */}
          {isGlobalLoading ? (
            <SkeletonList count={4} />
          ) : filteredGlobalDisasters.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No global events match these filters</p>
              <p className="text-xs text-slate-400 mt-1">Try another hazard type or alert level.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout" initial={false}>
                  {displayedGlobalDisasters.map((gEvent) => (
                    <motion.article
                      key={gEvent.id}
                      {...CARD_MOTION}
                      className="group bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3 hover:border-slate-300 hover:shadow-[0_10px_28px_-16px_rgba(15,23,42,.35)] transition-[border-color,box-shadow] duration-200"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tag tone={ALERT_TONE[gEvent.alertLevel] ?? 'slate'}>{gEvent.alertLevel} alert</Tag>
                        <Tag variant="outline" dot={false}>{gEvent.hazardType}</Tag>
                        <span className="ml-auto text-[11px] font-semibold text-slate-400 tabular-nums">
                          {gEvent.date ? new Date(gEvent.date).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unknown'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">{gEvent.title}</h3>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700 min-w-0">
                          <MapPin size={13} className="shrink-0" style={{ color: TONE.blue }} />
                          <span className="truncate">{gEvent.country}</span>
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{gEvent.description}</p>

                      <dl className="flex items-start gap-6 text-xs">
                        <div className="min-w-0">
                          <dt className="text-[11px] text-slate-400">GDACS severity</dt>
                          <dd className="font-semibold text-slate-800 mt-0.5 line-clamp-1" title={gEvent.severity}>{gEvent.severity}</dd>
                        </div>
                      </dl>

                      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <a
                          href={gEvent.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          <ExternalLink size={13} />
                          GDACS Portal
                        </a>
                        <button
                          onClick={() => handleEscalateGdacs(gEvent)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 hover:border-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                          Escalate to National EOC
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </motion.div>

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

      {/* Report incident */}
      <FormModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report Incident"
        icon={Siren}
        subtitle={prefillSource ? `Pre-filled from ${prefillSource}. Check each field before submitting.` : 'National EOC register'}
        width="max-w-2xl"
        onSubmit={handleCreateIncidentSubmit}
        footer={<>
          <GhostButton onClick={() => setReportModalOpen(false)}>Cancel</GhostButton>
          <PrimaryButton type="submit" pending={createIncidentMutation.isPending}>
            {createIncidentMutation.isPending ? 'Submitting…' : 'Submit report'}
          </PrimaryButton>
        </>}
      >
        <FormSection>
          <Field label="Title" required error={formErrors.title}>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                if (formErrors.title) setFormErrors((p) => ({ ...p, title: '' }));
              }}
              placeholder="e.g. Flash flood at Jalan Merbau"
              className={`${inputCls} ${formErrors.title ? '!border-red-500' : ''}`}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Disaster Type" required>
              <select value={newType} onChange={(e) => setNewType(e.target.value as DisasterType)} className={`${inputCls} cursor-pointer`}>
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
            </Field>
            <Field label="Reported Through" required>
              <select value={newSourceType} onChange={(e) => setNewSourceType(e.target.value as typeof newSourceType)} className={`${inputCls} cursor-pointer`}>
                <option value="Agency Patrol">Agency patrol / field team</option>
                <option value="Emergency 999">Emergency 999 call</option>
                <option value="Citizen Reported">Citizen (phone / walk-in)</option>
                <option value="Metrological / Sensor">Sensor alert (JPS / MET)</option>
              </select>
            </Field>
            <Field label="Severity" required>
              <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as SeverityLevel)} className={`${inputCls} cursor-pointer`}>
                <option value="Critical">Critical (life threatening)</option>
                <option value="High">High (major impact)</option>
                <option value="Medium">Medium (moderate risk)</option>
                <option value="Low">Low (advisory)</option>
              </select>
            </Field>
            <Field label="Disaster Level" required>
              <select value={newDisasterLevel} onChange={(e) => setNewDisasterLevel(e.target.value as DisasterLevel)} className={`${inputCls} cursor-pointer`}>
                <option value="Level 1: District">Level 1: District</option>
                <option value="Level 2: State">Level 2: State</option>
                <option value="Level 3: Federal">Level 3: Federal</option>
              </select>
            </Field>
          </div>
        </FormSection>

        <FormSection>
          <div className="space-y-2">
            <MalaysiaLocationPicker
              key={pickerKey}
              resolveOnMount={resolveOnOpen}
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
            {[formErrors.location, formErrors.district, formErrors.postcode].filter(Boolean).map((msg) => (
              <p key={msg} className="text-[11px] font-medium text-red-600">{msg}</p>
            ))}
          </div>
        </FormSection>

        <FormSection>
          <Field label="Observation/ Description" required error={formErrors.description}>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => {
                setNewDescription(e.target.value);
                if (formErrors.description) setFormErrors((p) => ({ ...p, description: '' }));
              }}
              placeholder="Water level, people trapped, road access, shelter needs"
              className={`${inputCls} resize-y ${formErrors.description ? '!border-red-500' : ''}`}
            />
          </Field>

          {/* Only once there is something to show: weather follows the pin, a contact only for people who called in.
            A lone field takes the full row so it never leaves a half-empty line. */}
          {(hasPin || needsReporterContact) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hasPin && (
                <Field
                  className={needsReporterContact ? '' : 'sm:col-span-2'}
                  label="Pinned Location Weather"
                  optional={!weatherAutoLoaded && !fetchingWeather}
                  aside={fetchingWeather
                    ? <span className="text-[11px] text-slate-400 flex items-center gap-1"><Loader2 size={11} className="animate-spin" />Checking</span>
                    : weatherAutoLoaded ? <span className="text-[11px] font-medium" style={{ color: TONE.teal }}>Filled from Open-Meteo</span> : null}
                >
                  <input
                    type="text"
                    value={newWeatherCondition}
                    onChange={(e) => {
                      setNewWeatherCondition(e.target.value);
                      setWeatherAutoLoaded(false);
                    }}
                    placeholder="e.g. Heavy rain, 28°C"
                    className={inputCls}
                  />
                </Field>
              )}
              {needsReporterContact && (
                <PhoneInput value={newReporterContact} onChange={setNewReporterContact} label="Caller's phone" placeholder="+60-12-3456 7890"
                  className={hasPin ? '' : 'sm:col-span-2'} />
              )}
            </div>
          )}
        </FormSection>

        <FormSection>
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="People Affected">
                <input type="number" min={0} value={newAffected} onChange={(e) => setNewAffected(e.target.value)} placeholder="Unknown" className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label="Casualties">
                <input type="number" min={0} value={newCasualties} onChange={(e) => setNewCasualties(e.target.value)} placeholder="Unknown" className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label="Infrastructure">
                <select value={newInfra} onChange={(e) => setNewInfra(e.target.value as typeof newInfra)} className={`${inputCls} cursor-pointer`}>
                  <option value="">Unknown</option><option>None</option><option>Minor</option><option>Moderate</option><option>Severe</option>
                </select>
              </Field>
              <Field label="Road Access" note="0–100">
                <input type="number" min={0} max={100} value={newAccess} onChange={(e) => setNewAccess(e.target.value)} placeholder="Unknown" className={`${inputCls} tabular-nums`} />
              </Field>
            </div>
            {formErrors.facts && <p className="text-[11px] font-medium text-red-600">{formErrors.facts}</p>}
          </div>
        </FormSection>

        <FormSection>
          <div>
            <MediaUploader items={newMedia} onChange={setNewMedia} disabled={createIncidentMutation.isPending} />
            {formErrors.media && <p className="text-[11px] font-medium text-red-600 mt-1">{formErrors.media}</p>}
          </div>
        </FormSection>
      </FormModal>

      {/* Possible duplicate */}
      <FormModal
        open={showDuplicateModal && !!duplicateMatch}
        onClose={() => setShowDuplicateModal(false)}
        title="Possible Duplicate"
        icon={CopyCheck}
        subtitle={duplicateMatch ? `An active ${duplicateMatch.type.toLowerCase()} is already open in ${duplicateMatch.district}, ${duplicateMatch.state}.` : undefined}
        width="max-w-2xl"
        footer={<>
          <GhostButton onClick={handleDuplicateConfirmAndReturn} className="mr-auto">Discard My Report</GhostButton>
          <button type="button" onClick={handleDuplicateUpdateExisting}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer">
            Update Existing
          </button>
          <PrimaryButton onClick={handleDuplicateProceedAsNew} pending={createIncidentMutation.isPending}>Create As New</PrimaryButton>
        </>}
      >
        {duplicateMatch && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                label: 'Existing Active Record',
                id: getCleanDisplayId(duplicateMatch.id, duplicateMatch.display_id),
                title: duplicateMatch.title,
                place: formatFullLocation(duplicateMatch.location, duplicateMatch.district, duplicateMatch.state, duplicateMatch.administrative_district),
                severity: duplicateMatch.severity,
                status: duplicateMatch.status,
                level: duplicateMatch.disaster_level,
                text: duplicateMatch.description,
              },
              {
                label: 'Your Report',
                id: 'Not saved',
                title: newTitle,
                place: [newLocation, newDistrict, newState].filter(Boolean).join(', '),
                severity: newSeverity,
                status: null,
                level: newDisasterLevel,
                text: newDescription,
              },
            ].map((r) => (
              <div key={r.label} className="rounded-xl border border-slate-200 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{r.label}</span>
                  <span className="text-[11px] font-semibold text-slate-400 tabular-nums">{r.id}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{r.title || 'Untitled'}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-700 min-w-0">
                    <MapPin size={12} className="shrink-0" style={{ color: TONE.blue }} />
                    <span className="truncate">{r.place || 'No location'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag tone={SEVERITY_TONE[r.severity] ?? 'slate'}>{r.severity}</Tag>
                  {r.status && <StatusTag status={r.status} />}
                  <LevelTag level={r.level} />
                </div>
                {r.text && <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{r.text.replace(/\*\*|__|#+\s/g, '')}</p>}
              </div>
            ))}
          </div>
        )}
      </FormModal>

      {/* Update incident */}
      <FormModal
        open={editModalOpen && !!editingIncident}
        onClose={() => setEditModalOpen(false)}
        title="Update Incident"
        icon={PencilLine}
        subtitle={editingIncident ? `${getCleanDisplayId(editingIncident.id, editingIncident.display_id)} · ${editingIncident.type}` : undefined}
        onSubmit={handleSaveEdit}
        footer={<>
          <GhostButton onClick={() => setEditModalOpen(false)}>Cancel</GhostButton>
          <PrimaryButton type="submit" pending={updateIncidentMutation.isPending}>
            {updateIncidentMutation.isPending ? 'Saving…' : 'Save changes'}
          </PrimaryButton>
        </>}
      >
        <FormSection>
          <Field label="Title" required error={editErrors.title}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                if (editErrors.title) setEditErrors({});
              }}
              className={`${inputCls} ${editErrors.title ? '!border-red-500' : ''}`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity" required error={editErrors.severity}>
              <select
                value={editSeverity}
                onChange={(e) => {
                  setEditSeverity(e.target.value as SeverityLevel);
                  if (editErrors.severity) setEditErrors((p) => ({ ...p, severity: '' }));
                }}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </Field>
            <Field label="Disaster Level" required error={editErrors.disasterLevel}>
              <select
                value={editDisasterLevel}
                onChange={(e) => {
                  setEditDisasterLevel(e.target.value as DisasterLevel);
                  if (editErrors.disasterLevel) setEditErrors((p) => ({ ...p, disasterLevel: '' }));
                }}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="Level 1: District">Level 1: District</option>
                <option value="Level 2: State">Level 2: State</option>
                <option value="Level 3: Federal">Level 3: Federal</option>
              </select>
            </Field>
          </div>
        </FormSection>

        <FormSection>
          <Field label="Situation Notes" required error={editErrors.description}>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => {
                setEditDescription(e.target.value);
                if (editErrors.description) setEditErrors((p) => ({ ...p, description: '' }));
              }}
              className={`${inputCls} resize-y ${editErrors.description ? '!border-red-500' : ''}`}
            />
          </Field>
        </FormSection>

        <FormSection>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="People Affected">
                <input type="number" min={0} value={editAffectedPopulation}
                  onChange={(e) => setEditAffectedPopulation(parseInt(e.target.value, 10) || 0)} className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label="Casualties">
                <input type="number" min={0} value={editCasualtiesCount}
                  onChange={(e) => setEditCasualtiesCount(parseInt(e.target.value, 10) || 0)} className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label="Infrastructure Damage">
                <select value={editInfrastructureDamage} onChange={(e) => setEditInfrastructureDamage(e.target.value as typeof editInfrastructureDamage)} className={`${inputCls} cursor-pointer`}>
                  <option value="None">None</option>
                  <option value="Minor">Minor</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
              </Field>
              <Field label="Road Access" note="0–100">
                <input type="number" min={0} max={100} value={editAccessibilityScore}
                  onChange={(e) => setEditAccessibilityScore(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))} className={`${inputCls} tabular-nums`} />
              </Field>
            </div>
            {editImpactChanged && <p className="text-[11px] text-slate-500">Saving re-runs the AI assessment with the new figures.</p>}
          </div>
        </FormSection>

        <FormSection>
          <div>
            <MediaUploader
              existingPreviews={editPreviews}
              items={editMedia}
              onChange={setEditMedia}
              existingRefs={editExistingMedia}
              onRemoveExisting={(ref) => setEditExistingMedia((prev) => prev.filter((r) => r !== ref))}
              disabled={updateIncidentMutation.isPending}
            />
            {editErrors.media && <p className="text-[11px] font-medium text-red-600 mt-1">{editErrors.media}</p>}
          </div>
        </FormSection>
      </FormModal>

      {/* Archive */}
      <ConfirmModal
        open={deleteModalOpen && !!incidentToDelete}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Archive this incident?"
        icon={Archive}
        confirmLabel={deleteIncidentMutation.isPending ? 'Archiving…' : 'Archive'}
        pending={deleteIncidentMutation.isPending}
        danger
      >
        {incidentToDelete && (
          <>Are you sure you want to remove <span className="font-semibold text-slate-800">{getCleanDisplayId(incidentToDelete.id, incidentToDelete.display_id)}</span>?</>
        )}
      </ConfirmModal>
    </motion.div>
  );
};

export default IncidentManagement;
