import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"

interface ProgressBarProps {
  isActive: boolean
  onComplete?: () => void
  duration?: number // duration in milliseconds
}

const ProgressBar = ({ isActive, onComplete, duration = 8000 }: ProgressBarProps) => {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")

  const steps = [
    { percent: 15, message: "Analyse de la demande..." },
    { percent: 30, message: "Configuration IA récupérée..." },
    { percent: 45, message: "Connexion à l'API Mistral..." },
    { percent: 65, message: "Génération de la réponse..." },
    { percent: 80, message: "Traitement des données..." },
    { percent: 95, message: "Finalisation de la carte..." },
    { percent: 100, message: "Carte générée avec succès!" }
  ]

  useEffect(() => {
    if (!isActive) {
      setProgress(0)
      setCurrentStep("")
      return
    }

    let currentStepIndex = 0
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        const step = steps[currentStepIndex]
        setProgress(step.percent)
        setCurrentStep(step.message)
        
        if (step.percent === 100) {
          setTimeout(() => {
            onComplete?.()
          }, 500)
        }
        
        currentStepIndex++
      } else {
        clearInterval(interval)
      }
    }, duration / steps.length)

    return () => clearInterval(interval)
  }, [isActive, duration, onComplete])

  if (!isActive) return null

  return (
    <Card className="w-full bg-background/95 backdrop-blur-sm border-primary/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Génération en cours...</span>
            <span className="font-medium text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">{currentStep}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default ProgressBar