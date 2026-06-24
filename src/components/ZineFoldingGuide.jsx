import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import * as Separator from '@radix-ui/react-separator';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Scissors,
  FoldVertical,
  ArrowLeftRight,
  Eye,
  BookOpen,
  Lightbulb,
  CircleCheck as CheckCircle2,
} from 'lucide-react';
import { cn } from '../utils/helpers.js';

// Animation config matching app motion language
const ANIMATION_CONFIG = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1],
};

const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 16 : -16,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -16 : 16,
    opacity: 0,
  }),
};

// 8-step folding documentation data (compact descriptions)
const STEPS = [
  {
    id: 'plan',
    number: 1,
    title: 'Plan the Layout',
    foldType: 'prepare',
    description: 'Arrange 8 pages on one sheet in correct order for proper reading sequence after folding.',
    image: '/fold-guide/step-0-plan.png',
    imageAlt: 'Page layout diagram',
    tip: 'Front cover goes outside; pages read in order.',
    icon: FileText,
  },
  {
    id: 'crease',
    number: 2,
    title: 'Crease Both Ways',
    foldType: 'valley',
    description: 'Fold in half along long edge, crease and unfold. Repeat along short edge.',
    image: '/fold-guide/step-1-crease.png',
    imageAlt: 'Crease lines diagram',
    tip: 'Use fingernail or bone folder for crisp creases.',
    icon: FoldVertical,
  },
  {
    id: 'quarters',
    number: 3,
    title: 'Mark Quarters',
    foldType: 'valley',
    description: 'Fold outer edges to center crease, creating quarter divisions. Unfold flat.',
    image: '/fold-guide/step-2-quarters.png',
    imageAlt: 'Quarter crease marks',
    tip: 'Precise folds ensure even collapse.',
    icon: ArrowLeftRight,
  },
  {
    id: 'cut',
    number: 4,
    title: 'Cut the Center',
    foldType: 'cut',
    description: 'Fold in half along short edge. Cut center crease through both layers, stopping at quarter marks.',
    image: '/fold-guide/step-3-cut.png',
    imageAlt: 'Center cut diagram',
    tip: 'Cut only middle half — not all the way across.',
    icon: Scissors,
  },
  {
    id: 'open',
    number: 5,
    title: 'Open Flat',
    foldType: 'prepare',
    description: 'Unfold completely. A short center slit appears — key to the magic fold.',
    image: '/fold-guide/step-4-open.png',
    imageAlt: 'Flat sheet with center slit',
    tip: 'Slit creates flexibility for collapse.',
    icon: Eye,
  },
  {
    id: 'strip',
    number: 6,
    title: 'Fold into Strip',
    foldType: 'valley',
    description: 'Fold in half along long crease again. Pages face outward on both sides.',
    image: '/fold-guide/step-5-fold-strip.png',
    imageAlt: 'Folded strip with pages outward',
    tip: 'Keep artwork facing outward.',
    icon: FoldVertical,
  },
  {
    id: 'push',
    number: 7,
    title: 'Push into Diamond',
    foldType: 'mountain',
    description: 'Push both ends inward — slit opens into diamond shape. Bring sides together.',
    image: '/fold-guide/step-6-push-in.png',
    imageAlt: 'Diamond cross-shape forming',
    tip: 'This is the magic step.',
    icon: ArrowLeftRight,
  },
  {
    id: 'done',
    number: 8,
    title: 'Press Flat',
    foldType: 'finish',
    description: 'Press flat — finished 8-page booklet, no staples or glue needed!',
    image: '/fold-guide/step-7-done.png',
    imageAlt: 'Finished zine booklet',
    tip: 'Trim edges for clean finish.',
    icon: BookOpen,
  },
];

// Performance: Pre-compute O(1) lookups for steps to avoid O(n) array traversals during re-renders
const STEP_INDEX_MAP = STEPS.reduce((acc, step, index) => {
  acc[step.id] = index;
  return acc;
}, {});

const STEP_DATA_MAP = STEPS.reduce((acc, step) => {
  acc[step.id] = step;
  return acc;
}, {});

// Fold type badge configuration
const FOLD_TYPE_CONFIG = {
  prepare: { label: 'Prep', className: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  valley: { label: 'Valley', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  mountain: { label: 'Mountain', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  cut: { label: 'Cut', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  finish: { label: 'Done', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

// Sub-component: Fold Type Badge (compact)
function FoldTypeBadge({ type }) {
  const config = FOLD_TYPE_CONFIG[type] || FOLD_TYPE_CONFIG.prepare;
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-semibold border',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

// Sub-component: Compact Tip
function TipCompact({ children }) {
  return (
    <div className="flex items-start gap-1.5 text-xs text-amber-700">
      <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span className="leading-tight">{children}</span>
    </div>
  );
}

// Sub-component: Compact Diagram
function DiagramCompact({ src, alt }) {
  return (
    <figure className="relative rounded-lg overflow-hidden bg-zinc-50 border border-zinc-200">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain p-2"
        loading="lazy"
      />
    </figure>
  );
}

// Sub-component: Compact Step Icon
function StepIconCompact({ icon: Icon, isActive, isCompleted, size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div
      className={cn(
        'rounded-lg flex items-center justify-center transition-colors duration-150',
        sizeClasses,
        isCompleted
          ? 'bg-emerald-100 text-emerald-600'
          : isActive
          ? 'bg-amber-100 text-amber-600'
          : 'bg-zinc-100 text-zinc-400'
      )}
    >
      {isCompleted ? (
        <CheckCircle2 className={iconSize} aria-hidden="true" />
      ) : (
        <Icon className={iconSize} aria-hidden="true" />
      )}
    </div>
  );
}

// Sub-component: Desktop Step Detail (compact horizontal layout)
function StepDetailDesktop({ step, direction, onPrev, onNext }) {
  const prefersReducedMotion = useReducedMotion();
  const currentIndex = STEP_INDEX_MAP[step.id];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < STEPS.length - 1;

  return (
    <motion.div
      key={step.id}
      custom={direction}
      variants={prefersReducedMotion ? undefined : stepVariants}
      initial={prefersReducedMotion ? { opacity: 0 } : 'enter'}
      animate="center"
      exit={prefersReducedMotion ? { opacity: 0 } : 'exit'}
      transition={{
        duration: prefersReducedMotion ? 0.1 : ANIMATION_CONFIG.duration,
        ease: ANIMATION_CONFIG.ease,
      }}
      className="flex flex-col h-full"
    >
      {/* Header row: icon + step number + title + badge */}
      <div className="flex items-center gap-2 mb-2">
        <StepIconCompact icon={step.icon} isActive={true} isCompleted={false} />
        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
          {step.number}/8
        </span>
        <h3 className="text-sm font-semibold text-zinc-900 flex-1">{step.title}</h3>
        <FoldTypeBadge type={step.foldType} />
      </div>

      {/* Content: diagram left, text right */}
      <div className="grid grid-cols-[140px_1fr] gap-3 flex-1">
        {/* Diagram */}
        <div className="h-[100px]">
          <DiagramCompact src={step.image} alt={step.imageAlt} />
        </div>

        {/* Text content */}
        <div className="flex flex-col justify-between py-0.5">
          <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
            {step.description}
          </p>
          <TipCompact>{step.tip}</TipCompact>
        </div>
      </div>

      {/* Navigation row */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-100">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="Previous step"
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            canGoPrev
              ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              : 'bg-zinc-50 text-zinc-300 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next step"
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            canGoNext
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
          )}
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// Sub-component: Desktop Sidebar Step Item (compact)
function SidebarStepItem({ step, isActive, isCompleted, onClick }) {
  return (
    <button
      onClick={() => onClick(step.id)}
      aria-current={isActive ? 'step' : undefined}
      className={cn(
        'w-full text-left p-2 rounded-lg transition-all duration-150 group',
        'flex items-center gap-2',
        isActive
          ? 'bg-white shadow-sm ring-1 ring-amber-200'
          : 'hover:bg-white/50'
      )}
    >
      <StepIconCompact icon={step.icon} isActive={isActive} isCompleted={isCompleted} size="sm" />
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'text-xs font-medium truncate transition-colors',
            isActive ? 'text-zinc-900' : 'text-zinc-600 group-hover:text-zinc-900'
          )}
        >
          {step.number}. {step.title}
        </div>
      </div>
      {isActive && (
        <ChevronRight className="w-3 h-3 text-amber-500 flex-shrink-0" aria-hidden="true" />
      )}
    </button>
  );
}

// Sub-component: Mobile Step Card (fixed height, no expansion)
function MobileStepCard({ step, isActive, direction, onPrev, onNext }) {
  const prefersReducedMotion = useReducedMotion();
  const currentIndex = STEP_INDEX_MAP[step.id];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < STEPS.length - 1;

  return (
    <motion.div
      key={step.id}
      custom={direction}
      variants={prefersReducedMotion ? undefined : stepVariants}
      initial={prefersReducedMotion ? { opacity: 0 } : 'enter'}
      animate="center"
      exit={prefersReducedMotion ? { opacity: 0 } : 'exit'}
      transition={{
        duration: prefersReducedMotion ? 0.1 : ANIMATION_CONFIG.duration,
        ease: ANIMATION_CONFIG.ease,
      }}
      className="bg-white rounded-xl border border-zinc-200 shadow-sm p-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <StepIconCompact icon={step.icon} isActive={true} isCompleted={false} />
        <span className="text-[10px] font-bold text-amber-600 uppercase">
          {step.number}/8
        </span>
        <h3 className="text-sm font-semibold text-zinc-900 flex-1">{step.title}</h3>
        <FoldTypeBadge type={step.foldType} />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-[120px_1fr] gap-2.5">
        {/* Diagram */}
        <div className="h-[85px]">
          <DiagramCompact src={step.image} alt={step.imageAlt} />
        </div>

        {/* Text */}
        <div className="flex flex-col justify-between">
          <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
            {step.description}
          </p>
          <TipCompact>{step.tip}</TipCompact>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-zinc-100">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            canGoPrev
              ? 'bg-zinc-100 text-zinc-700'
              : 'bg-zinc-50 text-zinc-300 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            canGoNext
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
          )}
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// Sub-component: Mobile Step Pills Navigation
function MobileStepPills({ steps, activeStep, onStepClick, scrollRef }) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector(`[data-step="${activeStep}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [activeStep, prefersReducedMotion, scrollRef]);

  return (
    <div
      role="tablist"
      aria-label="Folding steps"
      className="flex gap-1.5 overflow-x-auto py-1 -mx-1 px-1 scrollbar-hide"
    >
      {steps.map((step) => {
        const isActive = activeStep === step.id;
        return (
          <button
            key={step.id}
            data-step={step.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onStepClick(step.id)}
            className={cn(
              'flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all',
              isActive
                ? 'bg-amber-500 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            )}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
              {step.number}
            </span>
            <span className="hidden sm:inline">{step.title}</span>
          </button>
        );
      })}
    </div>
  );
}

// Main Component: ZineFoldingGuide (compact, no-scroll design)
export function ZineFoldingGuide() {
  const [activeStep, setActiveStep] = useState(STEPS[0].id);
  const [direction, setDirection] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const pillsScrollRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStepClick = useCallback((stepId) => {
    const currentIndex = STEP_INDEX_MAP[activeStep];
    const newIndex = STEP_INDEX_MAP[stepId];
    setDirection(newIndex > currentIndex ? 1 : -1);
    setActiveStep(stepId);

    if (newIndex > currentIndex) {
      setCompletedSteps((prev) => {
        const newSet = new Set(prev);
        const prevStep = STEPS[currentIndex];
        if (prevStep) newSet.add(prevStep.id);
        return newSet;
      });
    }
  }, [activeStep]);

  const handlePrev = useCallback(() => {
    const currentIndex = STEP_INDEX_MAP[activeStep];
    if (currentIndex > 0) handleStepClick(STEPS[currentIndex - 1].id);
  }, [activeStep, handleStepClick]);

  const handleNext = useCallback(() => {
    const currentIndex = STEP_INDEX_MAP[activeStep];
    if (currentIndex < STEPS.length - 1) handleStepClick(STEPS[currentIndex + 1].id);
  }, [activeStep, handleStepClick]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  const activeStepData = STEP_DATA_MAP[activeStep];

  return (
    <section aria-label="How to fold your zine" className="simulation-guide-panel">
      {/* Header */}
      <div className="simulation-panel-top mb-2">
        <div>
          <p className="simulation-panel-kicker">How to fold</p>
          <p className="simulation-panel-title">8 pages · 1 sheet · 1 cut</p>
        </div>
      </div>

      <Separator.Root className="my-3 h-px bg-zinc-200" />

      {/* Mobile View */}
      {isMobile && (
        <div className="space-y-2.5">
          <MobileStepPills
            steps={STEPS}
            activeStep={activeStep}
            onStepClick={handleStepClick}
            scrollRef={pillsScrollRef}
          />

          <AnimatePresence mode="wait" custom={direction}>
            {activeStepData && (
              <MobileStepCard
                step={activeStepData}
                isActive={true}
                direction={direction}
                onPrev={handlePrev}
                onNext={handleNext}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Desktop View: Compact two-column */}
      {!isMobile && (
        <div className="grid grid-cols-[180px_1fr] gap-3">
          {/* Left: Compact step list */}
          <div className="bg-zinc-50/50 rounded-lg p-2 border border-zinc-200">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
              Steps
            </div>
            <nav aria-label="Folding steps navigation">
              <ol className="space-y-1">
                {STEPS.map((step) => {
                  const isActive = activeStep === step.id;
                  const isCompleted = completedSteps.has(step.id);
                  return (
                    <li key={step.id}>
                      <SidebarStepItem
                        step={step}
                        isActive={isActive}
                        isCompleted={isCompleted}
                        onClick={handleStepClick}
                      />
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          {/* Right: Step detail */}
          <div className="bg-white rounded-lg p-3 border border-zinc-200 shadow-sm">
            <AnimatePresence mode="wait" custom={direction}>
              {activeStepData && (
                <StepDetailDesktop
                  step={activeStepData}
                  direction={direction}
                  onPrev={handlePrev}
                  onNext={handleNext}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}

export default ZineFoldingGuide;
