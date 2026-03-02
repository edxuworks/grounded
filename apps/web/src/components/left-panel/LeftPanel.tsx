/**
 * LeftPanel — Tabbed Left Side Panel
 *
 * Contains three modes, toggled via the leftPanelMode UI store value:
 *  - 'deal-files'    : DealFileManager — list/create/delete deal files
 *  - 'create-deal'   : CreateDealForm — add a deal at the pending map pin
 *  - 'field-settings': FieldDefManager — custom fields (Phase 5)
 */

import { X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

const HOME_URL = "http://localhost:3000";
import { DealFileManager } from "@/components/left-panel/DealFileManager";
import { CreateDealForm } from "@/components/left-panel/CreateDealForm";
import { FieldDefManager } from "@/components/sidebar/FieldDefManager";

export function LeftPanel() {
  const { leftPanelMode, setLeftPanelMode, closeLeftPanel } = useUIStore();

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-black/10">
        <div className="flex items-center gap-3">
          <a
            href={HOME_URL}
            className="text-xs font-semibold tracking-widest uppercase text-land-text hover:text-land-accent transition-colors"
            title="GROUNDED home"
          >
            GROUNDED
          </a>
          <span className="text-black/10 select-none">|</span>
        <div className="flex gap-1">
          <TabButton
            active={leftPanelMode === "deal-files"}
            onClick={() => setLeftPanelMode("deal-files")}
          >
            Deals
          </TabButton>
          <TabButton
            active={leftPanelMode === "field-settings"}
            onClick={() => setLeftPanelMode("field-settings")}
          >
            Fields
          </TabButton>
        </div>
        </div>
        <button
          onClick={closeLeftPanel}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-land-muted hover:text-land-text transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Panel content */}
      <div className="p-4 max-h-[calc(100vh-120px)] overflow-y-auto styled-scrollbar">
        {leftPanelMode === "deal-files" && <DealFileManager />}
        {leftPanelMode === "create-deal" && <CreateDealForm />}
        {leftPanelMode === "field-settings" && <FieldDefManager />}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-land-accent text-white"
          : "text-land-muted hover:text-land-text hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}
