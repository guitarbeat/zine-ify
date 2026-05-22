import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { Separator } from '@radix-ui/react-separator';
import { FileText, Scissors, FoldVertical, ArrowLeftRight, ChevronRight, CircleCheck as CheckCircle, Eye, BookOpen } from 'lucide-react';
import clsx from 'clsx';

const STEPS = [
  {
    id: 'plan',
    number: 1,
    title: 'Plan the layout',
    description: 'Design your zine on one sheet, with the pages in this order and orientation.',
    image: '/fold-guide/step-0-plan.png',
    icon: FileText,
    tip: 'Page ordering is crucial for proper folding.',
  },
  {
    id: 'crease',
    number: 2,
    title: 'Crease both directions',
    description: 'Crease the sheet along both main directions — fold in half each way, then open flat.',
    image: '/fold-guide/step-1-crease.png',
    icon: FoldVertical,
    tip: 'Use your nail or a bone folder for crisp creases.',
  },
  {
    id: 'quarters',
    number: 3,
    title: 'Mark quarters',
    description: 'Make two more creases to divide the long direction into quarters, then open flat again.',
    image: '/fold-guide/step-2-quarters.png',
    icon: ArrowLeftRight,
    tip: 'Align edges carefully for even divisions.',
  },
  {
    id: 'cut',
    number: 4,
    title: 'Cut the center',
    description: 'Fold in half, then cut along the center — through both layers, but only as far as the quarter-fold marks.',
    image: '/fold-guide/step-3-cut.png',
    icon: Scissors,
    tip: 'Stop at the quarter marks — don\'t cut all the way across.',
  },
  {
    id: 'open',
    number: 5,
    title: 'Open flat',
    description: 'Open it out flat. You\'ll see a short slit running through the center of the sheet.',
    image: '/fold-guide/step-4-open.png',
    icon: Eye,
    tip: 'The slit creates the fold flexibility.',
  },
  {
    id: 'strip',
    number: 6,
    title: 'Fold into a strip',
    description: 'Fold in half along the long direction so all your pages are still on the outside.',
    image: '/fold-guide/step-5-fold-strip.png',
    icon: FoldVertical,
    tip: 'Keep the artwork facing outward.',
  },
  {
    id: 'push',
    number: 7,
    title: 'Push into a diamond',
    description: 'Push inward from both short ends — the slit opens into a cross or diamond shape. Bring the pages together.',
    image: '/fold-guide/step-6-push-in.png',
    icon: ArrowLeftRight,
    tip: 'The diamond is the magic step.',
  },
  {
    id: 'done',
    number: 8,
    title: 'Press into a booklet',
    description: 'Press flat. That\'s your finished zine — 8 pages, no stapling or gluing needed!',
    image: '/fold-guide/step-7-done.png',
    icon: BookOpen,
    tip: 'Optional: trim edges for a clean finish.',
  },
];

function StepIcon({ icon: Icon, isActive, isCompleted }) {
  return (
    <div
      className={clsx(
        'w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200',
        isCompleted
          ? 'bg-emerald-100 text-emerald-600'
          : isActive
          ? 'bg-amber-100 text-amber-600'
          : 'bg-zinc-100 text-zinc-400'
      )}
    >
      {isCompleted ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <Icon className="w-5 h-5" />
      )}
    </div>
  );
}

function StepNavItem({ step, isActive, isCompleted, onClick }) {
  return (
    <button
      onClick={() => onClick(step.id)}
      className={clsx(
        'w-full text-left p-3 rounded-xl transition-all duration-200 group',
        'flex items-start gap-3',
        isActive
          ? 'bg-white shadow-sm ring-1 ring-amber-200'
          : 'hover:bg-white/50'
      )}
    >
      <StepIcon icon={step.icon} isActive={isActive} isCompleted={isCompleted} />
      <div className="flex-1 min-w-0">
        <div
          className={clsx(
            'text-sm font-semibold transition-colors',
            isActive ? 'text-zinc-900' : 'text-zinc-600 group-hover:text-zinc-900'
          )}
        >
          {step.number}. {step.title}
        </div>
        <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
          {step.tip}
        </div>
      </div>
      {isActive && (
        <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
      )}
    </button>
  );
}

function StepContent({ step, isActive }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 16 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={clsx(
        'step-content',
        !isActive && 'hidden'
      )}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <StepIcon icon={step.icon} isActive={true} isCompleted={false} />
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Step {step.number}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mt-1">
              {step.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-600 leading-relaxed">
          {step.description}
        </p>

        {/* Image */}
        <div className="relative rounded-xl overflow-hidden bg-zinc-50 border border-zinc-200">
          <img
            src={step.image}
            alt={step.title}
            className="w-full h-auto object-contain"
            loading="lazy"
          />
        </div>

        {/* Tip */}
        <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
          <div className="text-amber-500 flex-shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Tip:</span> {step.tip}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Mobile view - vertical stack of steps
function MobileFoldGuide({ activeStep, setActiveStep }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const handleStepClick = (stepId) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(stepId);
      return newSet;
    });
    setActiveStep(stepId);
  };

  return (
    <div className="space-y-4">
      {STEPS.map((step) => {
        const isActive = activeStep === step.id;
        const isCompleted = completedSteps.has(step.id);

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: step.number * 0.05 }}
            className={clsx(
              'rounded-xl border transition-all duration-200',
              isActive
                ? 'bg-white border-amber-200 shadow-sm'
                : 'bg-white/50 border-zinc-200'
            )}
          >
            <button
              className="w-full text-left"
              onClick={() => handleStepClick(step.id)}
            >
              {/* Header - always visible */}
              <div className="p-4 flex items-start gap-3">
                <StepIcon icon={step.icon} isActive={isActive} isCompleted={isCompleted} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                      Step {step.number}
                    </span>
                  </div>
                  <h3 className={clsx(
                    'text-base font-semibold transition-colors',
                    isActive ? 'text-zinc-900' : 'text-zinc-700'
                  )}>
                    {step.title}
                  </h3>
                </div>
              </div>

              {/* Content - visible when active */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4">
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        {step.description}
                      </p>

                      <div className="relative rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200">
                        <img
                          src={step.image}
                          alt={step.title}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                      </div>

                      <div className="flex gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                        <Eye className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-800">
                          {step.tip}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Completion checkmark */}
            {isCompleted && !isActive && (
              <div className="absolute top-4 right-4">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// Desktop view - two-column layout
function DesktopFoldGuide({ activeStep, setActiveStep }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const handleStepClick = (stepId) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(stepId);
      return newSet;
    });
    setActiveStep(stepId);
  };

  const activeStepData = STEPS.find(s => s.id === activeStep);

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left: Step navigation */}
      <div className="bg-zinc-50/50 rounded-xl p-3 border border-zinc-200">
        <div className="mb-3 pb-3 border-b border-zinc-200">
          <h4 className="text-sm font-semibold text-zinc-700">Folding Steps</h4>
          <p className="text-xs text-zinc-500 mt-0.5">Click any step to view</p>
        </div>

        <ScrollArea className="h-[calc(100%-4rem)] pr-2">
          <nav className="space-y-1">
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              const isCompleted = completedSteps.has(step.id);

              return (
                <StepNavItem
                  key={step.id}
                  step={step}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  onClick={handleStepClick}
                />
              );
            })}
          </nav>
        </ScrollArea>
      </div>

      {/* Right: Step detail */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-sm overflow-y-auto">
        {activeStepData ? (
          <StepContent step={activeStepData} isActive={true} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400">
            <BookOpen className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Select a step to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function FoldingGuide() {
  const [activeStep, setActiveStep] = useState(STEPS[0].id);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section
      aria-label="How to fold"
      className="simulation-guide-panel"
    >
      {/* Header */}
      <div className="simulation-panel-top">
        <div>
          <p className="simulation-panel-kicker">How to fold</p>
          <p className="simulation-panel-title">8 pages · 1 sheet · 1 cut</p>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Content */}
      {isMobile ? (
        <MobileFoldGuide
          activeStep={activeStep}
          setActiveStep={setActiveStep}
        />
      ) : (
        <DesktopFoldGuide
          activeStep={activeStep}
          setActiveStep={setActiveStep}
        />
      )}
    </section>
  );
}

export default FoldingGuide;
