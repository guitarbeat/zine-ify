import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Separator from '@radix-ui/react-separator';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronLeft, ChevronRight, FileText, Scissors, FoldVertical, ArrowLeftRight, Eye, BookOpen, Lightbulb, CircleCheck as CheckCircle2, Menu } from 'lucide-react';
import { cn } from '../utils/helpers.js';

// Animation variants matching existing app motion language
const ANIMATION_CONFIG = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1], // easeInOut equivalent
  spring: { stiffness: 300, damping: 25 },
};

const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 24 : -24,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -24 : 24,
    opacity: 0,
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

// 8-step folding documentation data
const STEPS = [
  {
    id: 'plan',
    number: 1,
    title: 'Plan the Layout',
    foldType: 'prepare',
    description:
      'Design your zine on one sheet of paper, arranging all 8 pages in the correct order and orientation. The layout shows which page goes where so they appear in proper reading order after folding.',
    image: '/fold-guide/step-0-plan.png',
    imageAlt:
      'Page layout diagram showing the correct order and orientation of all 8 pages on one sheet',
    tip: 'Page ordering is crucial — the front cover ends up on the outside, and pages read in order from front to back when folded correctly.',
    icon: FileText,
  },
  {
    id: 'crease',
    number: 2,
    title: 'Crease Both Directions',
    foldType: 'valley',
    description:
      'Fold the sheet in half along the long edge, crease firmly, and unfold. Then fold in half along the short edge, crease, and unfold. You now have a cross-shaped crease pattern.',
    image: '/fold-guide/step-1-crease.png',
    imageAlt: 'Sheet with dashed crease lines along both axes showing valley folds',
    tip: 'Use your fingernail or a bone folder for crisp, sharp creases. Well-defined folds make later steps much easier.',
    icon: FoldVertical,
  },
  {
    id: 'quarters',
    number: 3,
    title: 'Mark the Quarters',
    foldType: 'valley',
    description:
      'Fold each outer edge of the long side toward the center crease, creating two more parallel creases. Now the sheet is divided into quarters along its length. Unfold flat.',
    image: '/fold-guide/step-2-quarters.png',
    imageAlt: 'Sheet folded to show quarter crease marks along the long axis',
    tip: 'Align edges carefully for even divisions. Precise quarter folds ensure the booklet collapses evenly.',
    icon: ArrowLeftRight,
  },
  {
    id: 'cut',
    number: 4,
    title: 'Cut the Center',
    foldType: 'cut',
    description:
      'Fold the sheet in half along the short edge. Use scissors to cut along the center crease — through both layers — but stop at the quarter-fold marks. Do not cut all the way across.',
    image: '/fold-guide/step-3-cut.png',
    imageAlt: 'Sheet folded in half with a cut shown along the center between the quarter marks',
    tip: 'The cut should span only the middle half of the sheet. Cutting too far will prevent proper folding.',
    icon: Scissors,
  },
  {
    id: 'open',
    number: 5,
    title: 'Open Flat',
    foldType: 'prepare',
    description:
      'Unfold the sheet completely. You will see a short horizontal slit in the center of the page. This slit is the key to the magic fold that follows.',
    image: '/fold-guide/step-4-open.png',
    imageAlt: 'Flat sheet showing the short cut slit in its center',
    tip: 'The slit creates flexibility at the center point, allowing the paper to collapse into a booklet.',
    icon: Eye,
  },
  {
    id: 'strip',
    number: 6,
    title: 'Fold into a Strip',
    foldType: 'valley',
    description:
      'Fold the sheet in half along the long center crease again, like a book. Your pages should all be facing outward — visible on the outside of the folded strip.',
    image: '/fold-guide/step-5-fold-strip.png',
    imageAlt: 'Sheet folded into a long strip with pages visible on the outside',
    tip: 'Keep the artwork facing outward. This determines which pages end up on the outside of your finished booklet.',
    icon: FoldVertical,
  },
  {
    id: 'push',
    number: 7,
    title: 'Push Into a Diamond',
    foldType: 'mountain',
    description:
      'Hold the folded strip at both short ends. Push inward toward the center — the slit will open, and the pages will spread into a star or diamond cross shape. Bring the two sides together so the front cover is on the outside.',
    image: '/fold-guide/step-6-push-in.png',
    imageAlt: 'The center slit opening into a diamond cross-shape as the ends are pushed together',
    tip: 'This is the magic step. The opening slit allows the paper to collapse into a booklet without any binding.',
    icon: ArrowLeftRight,
  },
  {
    id: 'done',
    number: 8,
    title: 'Press Into a Booklet',
    foldType: 'finish',
    description:
      'Press the collapsed shape flat between your palms. You now have a finished 8-page zine booklet — no stapling, gluing, or stitching required. The pages read in order from front to back.',
    image: '/fold-guide/step-7-done.png',
    imageAlt: 'The finished folded 8-page zine booklet',
    tip: 'Optional: trim the outer edges with a craft knife for a clean, professional finish.',
    icon: BookOpen,
  },
];

// Fold type badge configuration
const FOLD_TYPE_CONFIG = {
  prepare: {
    label: 'Prepare',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
  valley: {
    label: 'Valley Fold',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  mountain: {
    label: 'Mountain Fold',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  cut: {
    label: 'Cut',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  finish: {
    label: 'Finish',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

// Sub-component: Fold Type Badge
function FoldTypeBadge({ type }) {
  const config = FOLD_TYPE_CONFIG[type] || FOLD_TYPE_CONFIG.prepare;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

// Sub-component: Tip Callout
function TipCallout({ children }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl bg-amber-50/80 border border-amber-100/80">
      <div className="flex-shrink-0 mt-0.5">
        <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
      </div>
      <p className="text-sm text-amber-800 leading-relaxed">{children}</p>
    </div>
  );
}

// Sub-component: Diagram Placeholder
function DiagramPlaceholder({ src, alt, title }) {
  return (
    <figure className="relative rounded-xl overflow-hidden bg-zinc-50 border border-zinc-200">
      <div className="aspect-[4/3] w-full">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain p-4"
          loading="lazy"
        />
      </div>
      <figcaption className="sr-only">{alt}</figcaption>
    </figure>
  );
}

// Sub-component: Step Icon
function StepIcon({ icon: Icon, isActive, isCompleted }) {
  return (
    <div
      className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200',
        isCompleted
          ? 'bg-emerald-100 text-emerald-600'
          : isActive
          ? 'bg-amber-100 text-amber-600'
          : 'bg-zinc-100 text-zinc-400'
      )}
    >
      {isCompleted ? (
        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Icon className="w-5 h-5" aria-hidden="true" />
      )}
    </div>
  );
}

// Sub-component: Step Detail Panel
function StepDetail({ step, direction }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key={step.id}
      custom={direction}
      variants={prefersReducedMotion ? undefined : stepVariants}
      initial={prefersReducedMotion ? { opacity: 0 } : 'enter'}
      animate="center"
      exit={prefersReducedMotion ? { opacity: 0 } : 'exit'}
      transition={{
        duration: prefersReducedMotion ? 0.15 : ANIMATION_CONFIG.duration,
        ease: ANIMATION_CONFIG.ease,
      }}
      className="space-y-5"
    >
      {/* Header */}
      <motion.div
        variants={prefersReducedMotion ? undefined : itemVariants}
        className="flex items-start gap-4"
      >
        <StepIcon icon={step.icon} isActive={true} isCompleted={false} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Step {step.number} of 8
            </span>
            <FoldTypeBadge type={step.foldType} />
          </div>
          <h3 className="text-xl font-semibold text-zinc-900 mt-1.5 leading-tight">
            {step.title}
          </h3>
        </div>
      </motion.div>

      <Separator.Root className="h-px bg-zinc-200" />

      {/* Description */}
      <motion.p
        variants={prefersReducedMotion ? undefined : itemVariants}
        className="text-base text-zinc-600 leading-relaxed"
      >
        {step.description}
      </motion.p>

      {/* Diagram */}
      <motion.div variants={prefersReducedMotion ? undefined : itemVariants}>
        <DiagramPlaceholder
          src={step.image}
          alt={step.imageAlt}
          title={step.title}
        />
      </motion.div>

      {/* Tip */}
      <motion.div variants={prefersReducedMotion ? undefined : itemVariants}>
        <TipCallout>{step.tip}</TipCallout>
      </motion.div>
    </motion.div>
  );
}

// Sub-component: Desktop Step Navigation Sidebar
function StepNavSidebar({ steps, activeStep, completedSteps, onStepClick }) {
  return (
    <nav
      aria-label="Folding steps navigation"
      className="flex flex-col h-full"
    >
      <div className="pb-3 mb-3 border-b border-zinc-200">
        <h4 className="text-sm font-semibold text-zinc-700">Folding Steps</h4>
        <p className="text-xs text-zinc-500 mt-0.5">Click any step to view</p>
      </div>

      <ScrollArea.Root className="flex-1 min-h-0">
        <ScrollArea.Viewport className="h-full pr-2">
          <ol className="space-y-1.5">
            {steps.map((step) => {
              const isActive = activeStep === step.id;
              const isCompleted = completedSteps.has(step.id);

              return (
                <li key={step.id}>
                  <button
                    onClick={() => onStepClick(step.id)}
                    aria-current={isActive ? 'step' : undefined}
                    className={cn(
                      'w-full text-left p-3 rounded-xl transition-all duration-200 group',
                      'flex items-start gap-3',
                      isActive
                        ? 'bg-white shadow-sm ring-1 ring-amber-200'
                        : 'hover:bg-white/60'
                    )}
                  >
                    <StepIcon
                      icon={step.icon}
                      isActive={isActive}
                      isCompleted={isCompleted}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-sm font-semibold transition-colors',
                          isActive
                            ? 'text-zinc-900'
                            : 'text-zinc-600 group-hover:text-zinc-900'
                        )}
                      >
                        {step.number}. {step.title}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                        <FoldTypeBadge type={step.foldType} />
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight
                        className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="flex select-none touch-none p-0.5"
        >
          <ScrollArea.Thumb className="flex-1 bg-zinc-200 rounded-full relative" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </nav>
  );
}

// Sub-component: Mobile Step Navigation Pills
function MobileStepPills({ steps, activeStep, onStepClick }) {
  const scrollRef = React.useRef(null);
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
  }, [activeStep, prefersReducedMotion]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
      role="tablist"
      aria-label="Folding steps"
    >
      {steps.map((step) => {
        const isActive = activeStep === step.id;
        return (
          <button
            key={step.id}
            data-step={step.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`step-panel-${step.id}`}
            onClick={() => onStepClick(step.id)}
            className={cn(
              'flex-shrink-0 px-3 py-2 rounded-full text-xs font-semibold transition-all duration-200',
              isActive
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            )}
          >
            {step.number}
          </button>
        );
      })}
    </div>
  );
}

// Sub-component: Navigation Buttons
function StepNavigationButtons({ activeStep, onPrev, onNext }) {
  const currentIndex = STEPS.findIndex((s) => s.id === activeStep);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < STEPS.length - 1;

  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-200 mt-5">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label="Previous step"
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200',
          canGoPrev
            ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            : 'bg-zinc-50 text-zinc-300 cursor-not-allowed'
        )}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Previous
      </button>

      <span className="text-xs text-zinc-400 font-medium">
        {currentIndex + 1} / {STEPS.length}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next step"
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200',
          canGoNext
            ? 'bg-zinc-900 text-white hover:bg-zinc-800'
            : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
        )}
      >
        Next
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// Sub-component: Mobile Accordion Step
function MobileAccordionStep({
  step,
  isActive,
  isCompleted,
  onClick,
  prefersReducedMotion,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0.1 : 0.2,
        delay: prefersReducedMotion ? 0 : step.number * 0.03,
      }}
      className={cn(
        'rounded-xl border transition-all duration-200 overflow-hidden',
        isActive
          ? 'bg-white border-amber-200 shadow-sm'
          : 'bg-white/60 border-zinc-200'
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-expanded={isActive}
        aria-controls={`step-content-${step.id}`}
        className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      >
        <div className="flex items-start gap-3">
          <StepIcon icon={step.icon} isActive={isActive} isCompleted={isCompleted} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Step {step.number}
              </span>
              <FoldTypeBadge type={step.foldType} />
            </div>
            <h3
              className={cn(
                'text-base font-semibold transition-colors',
                isActive ? 'text-zinc-900' : 'text-zinc-700'
              )}
            >
              {step.title}
            </h3>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            id={`step-content-${step.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0.15 : 0.3,
              ease: ANIMATION_CONFIG.ease,
            }}
            className="overflow-hidden"
            role="region"
            aria-label={`${step.title} details`}
          >
            <div className="px-4 pb-4 space-y-4">
              <Separator.Root className="h-px bg-zinc-100" />

              <p className="text-sm text-zinc-600 leading-relaxed">
                {step.description}
              </p>

              <DiagramPlaceholder
                src={step.image}
                alt={step.imageAlt}
                title={step.title}
              />

              <TipCallout>{step.tip}</TipCallout>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Main Component: ZineFoldingGuide
export function ZineFoldingGuide() {
  const [activeStep, setActiveStep] = useState(STEPS[0].id);
  const [direction, setDirection] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Responsive breakpoint detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStepClick = useCallback((stepId) => {
    const currentIndex = STEPS.findIndex((s) => s.id === activeStep);
    const newIndex = STEPS.findIndex((s) => s.id === stepId);
    setDirection(newIndex > currentIndex ? 1 : -1);
    setActiveStep(stepId);

    // Mark previous step as completed when moving forward
    if (newIndex > currentIndex) {
      setCompletedSteps((prev) => {
        const newSet = new Set(prev);
        const prevStep = STEPS[currentIndex];
        if (prevStep) {
          newSet.add(prevStep.id);
        }
        return newSet;
      });
    }
  }, [activeStep]);

  const handlePrev = useCallback(() => {
    const currentIndex = STEPS.findIndex((s) => s.id === activeStep);
    if (currentIndex > 0) {
      handleStepClick(STEPS[currentIndex - 1].id);
    }
  }, [activeStep, handleStepClick]);

  const handleNext = useCallback(() => {
    const currentIndex = STEPS.findIndex((s) => s.id === activeStep);
    if (currentIndex < STEPS.length - 1) {
      handleStepClick(STEPS[currentIndex + 1].id);
    }
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

  const activeStepData = STEPS.find((s) => s.id === activeStep);

  return (
    <section
      aria-label="How to fold your zine"
      className="simulation-guide-panel"
    >
      {/* Header */}
      <div className="simulation-panel-top">
        <div>
          <p className="simulation-panel-kicker">How to fold</p>
          <p className="simulation-panel-title">8 pages · 1 sheet · 1 cut</p>
        </div>
      </div>

      <Separator.Root className="my-4 h-px bg-zinc-200" />

      {/* Mobile View */}
      {isMobile && (
        <div className="space-y-3">
          <MobileStepPills
            steps={STEPS}
            activeStep={activeStep}
            onStepClick={handleStepClick}
          />

          <ol className="space-y-3">
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              const isCompleted = completedSteps.has(step.id);

              return (
                <li key={step.id}>
                  <MobileAccordionStep
                    step={step}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    onClick={() => handleStepClick(step.id)}
                    prefersReducedMotion={prefersReducedMotion}
                  />
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Desktop View: Two-column layout */}
      {!isMobile && (
        <div className="grid grid-cols-2 gap-5 h-full">
          {/* Left: Step navigation sidebar */}
          <div className="bg-zinc-50/50 rounded-xl p-3 border border-zinc-200 min-h-[500px]">
            <StepNavSidebar
              steps={STEPS}
              activeStep={activeStep}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
            />
          </div>

          {/* Right: Step detail panel */}
          <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-sm">
            <ScrollArea.Root className="h-full">
              <ScrollArea.Viewport className="h-full">
                <AnimatePresence mode="wait" custom={direction}>
                  {activeStepData && (
                    <StepDetail
                      step={activeStepData}
                      direction={direction}
                    />
                  )}
                </AnimatePresence>

                <StepNavigationButtons
                  activeStep={activeStep}
                  onPrev={handlePrev}
                  onNext={handleNext}
                />
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                orientation="vertical"
                className="flex select-none touch-none p-0.5"
              >
                <ScrollArea.Thumb className="flex-1 bg-zinc-200 rounded-full relative" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>
        </div>
      )}
    </section>
  );
}

export default ZineFoldingGuide;
