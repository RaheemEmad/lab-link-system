import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const StyleGuide = () => {
  const colors = [
    { name: "Navy/Slate", var: "--navy-slate", value: "215 25% 27%" },
    { name: "Periwinkle Blue", var: "--periwinkle-blue", value: "225 73% 70%" },
    { name: "Periwinkle Light", var: "--periwinkle-light", value: "225 73% 80%" },
    { name: "Dental Slate", var: "--dental-slate", value: "215 20% 24%" },
    { name: "Soft Gray", var: "--soft-gray", value: "210 33% 96%" },
    { name: "Success Green", var: "--success-green", value: "152 69% 31%" },
    { name: "Urgent Red", var: "--urgent-red", value: "6 87% 63%" },
  ];

  const semanticColors = [
    { name: "Background", var: "--background", usage: "Main background" },
    { name: "Foreground", var: "--foreground", usage: "Main text" },
    { name: "Primary", var: "--primary", usage: "Primary actions" },
    { name: "Primary Foreground", var: "--primary-foreground", usage: "Text on primary" },
    { name: "Secondary", var: "--secondary", usage: "Secondary surfaces" },
    { name: "Secondary Foreground", var: "--secondary-foreground", usage: "Text on secondary" },
    { name: "Muted", var: "--muted", usage: "Muted backgrounds" },
    { name: "Muted Foreground", var: "--muted-foreground", usage: "Muted text" },
    { name: "Accent", var: "--accent", usage: "Accent elements" },
    { name: "Accent Foreground", var: "--accent-foreground", usage: "Text on accent" },
    { name: "Destructive", var: "--destructive", usage: "Destructive actions" },
    { name: "Border", var: "--border", usage: "Borders" },
    { name: "Input", var: "--input", usage: "Input borders" },
    { name: "Ring", var: "--ring", usage: "Focus rings" },
  ];

  const typography = [
    { name: "Heading 1", class: "text-4xl font-bold", sample: "The quick brown fox" },
    { name: "Heading 2", class: "text-3xl font-bold", sample: "The quick brown fox" },
    { name: "Heading 3", class: "text-2xl font-semibold", sample: "The quick brown fox" },
    { name: "Heading 4", class: "text-xl font-semibold", sample: "The quick brown fox" },
    { name: "Body Large", class: "text-lg", sample: "The quick brown fox jumps over the lazy dog" },
    { name: "Body", class: "text-base", sample: "The quick brown fox jumps over the lazy dog" },
    { name: "Body Small", class: "text-sm", sample: "The quick brown fox jumps over the lazy dog" },
    { name: "Caption", class: "text-xs text-muted-foreground", sample: "The quick brown fox jumps over the lazy dog" },
  ];

  const spacing = [
    { name: "0.5", value: "0.125rem", class: "w-0.5 h-0.5" },
    { name: "1", value: "0.25rem", class: "w-1 h-1" },
    { name: "2", value: "0.5rem", class: "w-2 h-2" },
    { name: "4", value: "1rem", class: "w-4 h-4" },
    { name: "6", value: "1.5rem", class: "w-6 h-6" },
    { name: "8", value: "2rem", class: "w-8 h-8" },
    { name: "12", value: "3rem", class: "w-12 h-12" },
    { name: "16", value: "4rem", class: "w-16 h-16" },
  ];

  const shadows = [
    { name: "Soft", var: "--shadow-soft", value: "0 2px 8px rgba(47, 59, 74, 0.04)" },
    { name: "Medium", var: "--shadow-medium", value: "0 4px 16px rgba(47, 59, 74, 0.08)" },
    { name: "Strong", var: "--shadow-strong", value: "0 8px 24px rgba(47, 59, 74, 0.12)" },
    { name: "Glow", var: "--shadow-glow", value: "0 0 20px rgba(136, 160, 234, 0.25)" },
  ];

  const radii = [
    { name: "None", value: "0", class: "rounded-none" },
    { name: "Small", value: "0.25rem", class: "rounded-sm" },
    { name: "Default", value: "0.5rem", class: "rounded" },
    { name: "Medium", value: "0.75rem", class: "rounded-md" },
    { name: "Large", value: "1rem", class: "rounded-lg" },
    { name: "XL", value: "1.5rem", class: "rounded-xl" },
    { name: "Full", value: "9999px", class: "rounded-full" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">LabLink Design System</h1>
          <p className="text-lg text-muted-foreground">
            Clean, professional, dental-grade aesthetics with Navy/Slate & Periwinkle Blue palette
          </p>
        </div>

        {/* Brand Colors */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Brand Colors</CardTitle>
            <CardDescription>Core color palette for LabLink identity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {colors.map((color) => (
                <div key={color.var} className="space-y-2">
                  <div
                    className="h-24 rounded-lg border border-border"
                    style={{ backgroundColor: `hsl(${color.value})` }}
                  />
                  <div>
                    <p className="font-medium text-sm">{color.name}</p>
                    <code className="text-xs text-muted-foreground">{color.var}</code>
                    <p className="text-xs text-muted-foreground">HSL: {color.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Semantic Colors */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Semantic Colors</CardTitle>
            <CardDescription>Context-aware color tokens for consistent theming</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {semanticColors.map((color) => (
                <div key={color.var} className="flex items-center gap-4">
                  <div
                    className="h-16 w-16 rounded-lg border border-border flex-shrink-0"
                    style={{ backgroundColor: `hsl(var(${color.var}))` }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{color.name}</p>
                    <code className="text-xs text-muted-foreground">{color.var}</code>
                    <p className="text-xs text-muted-foreground">{color.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Text styles and hierarchies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {typography.map((type) => (
                <div key={type.name} className="space-y-1">
                  <div className="flex items-baseline gap-4">
                    <Badge variant="outline" className="w-32">{type.name}</Badge>
                    <p className={type.class}>{type.sample}</p>
                  </div>
                  <code className="text-xs text-muted-foreground ml-36">{type.class}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spacing */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Spacing Scale</CardTitle>
            <CardDescription>Consistent spacing tokens (based on 0.25rem)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {spacing.map((space) => (
                <div key={space.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`${space.class} bg-primary rounded`} />
                    <span className="text-sm font-medium">{space.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{space.value}</p>
                  <code className="text-xs text-muted-foreground">{space.class}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Shadows */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Shadows</CardTitle>
            <CardDescription>Elevation and depth tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shadows.map((shadow) => (
                <div key={shadow.var} className="space-y-2">
                  <div
                    className="h-24 rounded-lg bg-card border border-border flex items-center justify-center"
                    style={{ boxShadow: shadow.value }}
                  >
                    <span className="text-sm font-medium">{shadow.name}</span>
                  </div>
                  <code className="text-xs text-muted-foreground block">{shadow.var}</code>
                  <p className="text-xs text-muted-foreground">{shadow.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Border Radius */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Border Radius</CardTitle>
            <CardDescription>Rounding scale for corners</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {radii.map((radius) => (
                <div key={radius.name} className="space-y-2">
                  <div
                    className={`h-16 w-16 ${radius.class} bg-primary`}
                  />
                  <p className="text-sm font-medium">{radius.name}</p>
                  <p className="text-xs text-muted-foreground">{radius.value}</p>
                  <code className="text-xs text-muted-foreground">{radius.class}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Components */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Component Examples</CardTitle>
            <CardDescription>Common UI elements using the design system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Badges</h3>
              <div className="flex flex-wrap gap-4">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                    <CardDescription>Card description goes here</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Card content with proper spacing and typography.</p>
                  </CardContent>
                </Card>
                <Card className="hover-lift">
                  <CardHeader>
                    <CardTitle>Hover Lift</CardTitle>
                    <CardDescription>Card with hover effect</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Hover over this card to see the lift animation.</p>
                  </CardContent>
                </Card>
                <Card className="card-interactive">
                  <CardHeader>
                    <CardTitle>Interactive</CardTitle>
                    <CardDescription>Card with full interaction</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Professional card animation with border glow.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transitions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Transitions</CardTitle>
            <CardDescription>Animation timing tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Fast (150ms)</p>
                <code className="text-xs text-muted-foreground">var(--transition-fast)</code>
                <div className="h-12 w-full bg-muted rounded-lg flex items-center px-4 hover:bg-primary hover:text-primary-foreground transition-all duration-[150ms]">
                  Hover me
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Base (250ms)</p>
                <code className="text-xs text-muted-foreground">var(--transition-base)</code>
                <div className="h-12 w-full bg-muted rounded-lg flex items-center px-4 hover:bg-primary hover:text-primary-foreground transition-all duration-[250ms]">
                  Hover me
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Slow (350ms)</p>
                <code className="text-xs text-muted-foreground">var(--transition-slow)</code>
                <div className="h-12 w-full bg-muted rounded-lg flex items-center px-4 hover:bg-primary hover:text-primary-foreground transition-all duration-[350ms]">
                  Hover me
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Spring (400ms)</p>
                <code className="text-xs text-muted-foreground">var(--transition-spring)</code>
                <div className="h-12 w-full bg-muted rounded-lg flex items-center px-4 hover:scale-105 hover:bg-primary hover:text-primary-foreground transition-all duration-[400ms] cubic-bezier(0.34, 1.56, 0.64, 1)">
                  Hover me
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StyleGuide;
