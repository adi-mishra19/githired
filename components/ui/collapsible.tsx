"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { useId } from "react"

function Collapsible({
  id,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  const generatedId = useId()
  return <CollapsiblePrimitive.Root data-slot="collapsible" id={id || generatedId} {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
