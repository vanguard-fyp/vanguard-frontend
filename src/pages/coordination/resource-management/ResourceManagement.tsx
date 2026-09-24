import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Warehouse, ClipboardCheck, Send, GitFork, PackagePlus, Plus } from 'lucide-react';
import {
  useInventory,
  useResourceRequests,
  useApproveResourceRequest,
  useRejectResourceRequest,
  useCreateResourceRequest,
} from '../../../hooks';
import { useAuth } from '../../../context/AuthContext';
import { InventoryStage } from '../../../components/ui/coordination/resource/InventoryStage';
import { RequestApprovalStage } from '../../../components/ui/coordination/resource/RequestApprovalStage';
import { AllocationTrackerStage } from '../../../components/ui/coordination/resource/AllocationTrackerStage';
import { PipelineFlowDiagram } from '../../../components/ui/coordination/resource/PipelineFlowDiagram';
import { SkeletonTable } from '../../../components/ui/shared/SkeletonLoader';
import { RequestDetailModal } from '../../../components/ui/coordination/resource/RequestDetailModal';
import { CreateResourceRequestModal } from '../../../components/ui/coordination/resource/CreateResourceRequestModal';
import { AddInventoryItemModal } from '../../../components/ui/coordination/resource/AddInventoryItemModal';
import { useToast } from '../../../context/ToastContext';
import type { ResourceRequest, ViewMode } from '../../../types';
import { containerAnim, itemAnim } from '../../../constants';

const ResourceManagement: React.FC = () => {
  const { data: inventory = [], isLoading: isInventoryLoading } = useInventory();
  const { data: requests = [], isLoading: isRequestsLoading } = useResourceRequests();
  const approveMutation = useApproveResourceRequest();
  const rejectMutation = useRejectResourceRequest();
  const createMutation = useCreateResourceRequest();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [activeStep, setActiveStep] = useState<ViewMode>(1);

  // Modal states
  const [selectedRequestForModal, setSelectedRequestForModal] = useState<ResourceRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);

  // Dynamic approver linked to current logged-in user
  const currentApprover = user?.name ? `${user.name} (${user.role} - ${user.agency || 'NADMA'})` : 'NADMA Incident Commander';
  const currentUserId = user?.id;

  const handleApprove = (id: string) => {
    approveMutation.mutate(
      { id, approver: currentApprover, approverUserId: currentUserId },
      {
        onSuccess: () =>
          toastSuccess('Request Approved', `Resource request has been approved by ${user?.name || 'Officer'} and enqueued for dispatch.`),
        onError: () => toastError('Approval Failed', 'Could not approve request. Please try again.'),
      }
    );
  };

  const handleReject = (id: string, reason?: string) => {
    rejectMutation.mutate(
      {
        id,
        approver: currentApprover,
        approverUserId: currentUserId,
        rejectionReason: reason || 'Requisition denied by EOC logistics review.',
      },
      {
        onSuccess: () => toastWarning('Request Rejected', `Resource request has been declined by ${user?.name || 'Officer'} and logged.`),
        onError: () => toastError('Rejection Failed', 'Could not reject request. Please try again.'),
      }
    );
  };

  const handleCreateRequest = (newReqData: Partial<ResourceRequest>) => {
    createMutation.mutate(newReqData, {
      onSuccess: () => toastSuccess('Request Submitted', 'New resource request is pending approval.'),
      onError: () => toastError('Submit Failed', 'Could not submit resource request.'),
    });
  };

  const pendingRequestsCount = requests.filter((r) => r.status === 'Pending Approval').length;
  const activeAllocationsCount = requests.filter(
    (r) => r.status === 'Approved' || r.status === 'Dispatched'
  ).length;
  const criticalItemsCount = inventory.filter((i) => i.status === 'Critical').length;

  const steps = [
    {
      id: 1 as const,
      num: '1',
      title: 'Inventory & HIL Analytics',
      sub: 'Stock & Depletion Forecast',
      icon: Warehouse,
      badge: `${inventory.length} Items`,
      badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 2 as const,
      num: '2',
      title: 'Request Review & HIL Approval',
      sub: 'AI Decision Advisory',
      icon: ClipboardCheck,
      badge: `${pendingRequestsCount} Pending`,
      badgeStyle:
        pendingRequestsCount > 0
          ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
          : 'bg-slate-100 text-slate-600 border-slate-200',
    },
    {
      id: 3 as const,
      num: '3',
      title: 'Allocation Tracker',
      sub: 'End-to-End Delivery',
      icon: Send,
      badge: `${activeAllocationsCount} Active`,
      badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  ];

  const isLoading = isInventoryLoading || isRequestsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonTable rows={5} cols={4} />
      </div>
    );
  }

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-6">
      {/* Page Header */}
      <motion.div variants={itemAnim} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Resource Management</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Response Coordination · Visual logistics pipeline with Human-in-the-Loop decision analytics across all stages
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowAddInventoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-all shadow-2xs cursor-pointer"
          >
            <Plus size={14} className="text-blue-600" />
            <span>Add Catalog Item</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <PackagePlus size={14} />
            <span>Create Requisition</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs">
            <button
              onClick={() => setActiveStep(1)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeStep !== 'all'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent'
              }`}
            >
              Stage View
            </button>
            <button
              onClick={() => setActiveStep('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeStep === 'all'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent'
              }`}
            >
              <GitFork size={13} className={activeStep === 'all' ? 'text-blue-600' : 'text-slate-500'} />
              <span>Pipeline Flow</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Summary */}
      <motion.div variants={itemAnim} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Items Tracked</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{inventory.length}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">5 Depot Categories</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-red-700 uppercase tracking-wide">Critical Stock</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{criticalItemsCount}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Below safety threshold</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Pending Approvals</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pendingRequestsCount}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Stage 2 HIL Review</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">In-Transit Allocations</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{activeAllocationsCount}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Stage 3 Live Tracker</p>
        </div>
      </motion.div>

      {/* Sleek Segmented Pipeline Navigation Bar (Hidden when in Full Pipeline Flow view) */}
      {activeStep !== 'all' && (
        <motion.div variants={itemAnim} className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
            {steps.map((s) => {
              const isActive = activeStep === s.id;

              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(s.id)}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left cursor-pointer border ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-white/50 border-slate-200/80 text-slate-600 hover:text-blue-950 hover:bg-white hover:border-blue-400 hover:shadow-xs hover:-translate-y-0.5'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 font-bold'
                    }`}
                  >
                    {s.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-bold truncate transition-colors ${
                          isActive ? 'text-blue-950' : 'text-slate-700 group-hover:text-blue-900'
                        }`}
                      >
                        {s.title}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate">{s.sub}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 transition-all ${
                      s.badgeStyle
                    } ${!isActive ? 'group-hover:border-blue-300 group-hover:shadow-2xs' : ''}`}
                  >
                    {s.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeStep === 1 && (
          <motion.div
            key="stage1"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <InventoryStage
              inventory={inventory}
              requests={requests}
              onRequestCreated={handleCreateRequest}
            />
          </motion.div>
        )}

        {activeStep === 2 && (
          <motion.div
            key="stage2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <RequestApprovalStage
              requests={requests}
              onApprove={handleApprove}
              onReject={handleReject}
              onSelectRequest={(req) => setSelectedRequestForModal(req)}
            />
          </motion.div>
        )}

        {activeStep === 3 && (
          <motion.div
            key="stage3"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <AllocationTrackerStage requests={requests} />
          </motion.div>
        )}

        {activeStep === 'all' && (
          <motion.div
            key="flow"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <PipelineFlowDiagram
              inventory={inventory}
              requests={requests}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Details Modal */}
      {selectedRequestForModal && (
        <RequestDetailModal
          request={selectedRequestForModal}
          onClose={() => setSelectedRequestForModal(null)}
        />
      )}

      {/* Create Requisition Modal */}
      <CreateResourceRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Add Catalog Item Modal */}
      <AddInventoryItemModal
        isOpen={showAddInventoryModal}
        onClose={() => setShowAddInventoryModal(false)}
      />
    </motion.div>
  );
};

export default ResourceManagement;
