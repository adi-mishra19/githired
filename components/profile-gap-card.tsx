"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import { ProfileGap } from "@/lib/ai/profile-analyzer";

interface ProfileGapCardProps {
  gap: ProfileGap;
  onActionClick?: (action: string) => void;
}

export function ProfileGapCard({ gap, onActionClick }: ProfileGapCardProps) {
  const priorityConfig = {
    high: {
      color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      icon: AlertCircle,
      borderColor: "border-red-200 dark:border-red-800"
    },
    medium: {
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      icon: Info,
      borderColor: "border-yellow-200 dark:border-yellow-800"
    },
    low: {
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      icon: Info,
      borderColor: "border-blue-200 dark:border-blue-800"
    }
  };

  const config = priorityConfig[gap.priority];
  const Icon = config.icon;

  const categoryIcons: Record<string, string> = {
    projects: "💼",
    skills: "🔧",
    certifications: "📜",
    experience: "🚀",
    education: "🎓"
  };

  return (
    <Card className={`${config.borderColor} border-2`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryIcons[gap.category]}</span>
            <div>
              <CardTitle className="text-lg">{gap.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge className={config.color}>
                  <Icon className="w-3 h-3 mr-1" />
                  {gap.priority} priority
                </Badge>
                <span className="text-xs capitalize">{gap.category}</span>
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{gap.description}</p>
        
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Action Steps:
          </h4>
          <ul className="space-y-2">
            {gap.actionItems.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="font-semibold text-primary mt-0.5">{index + 1}.</span>
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {onActionClick && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => onActionClick(gap.category)}
          >
            Update {gap.category}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

