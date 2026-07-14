import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { MetaLabel } from '@/components/ui/MetaLabel'
import { PageTransition } from '@/components/layout/PageTransition'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

function SettingRow({ label, description, control }: { label: string, description?: string, control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4"
      style={{ borderBottom: '1px solid var(--border-dim)' }}>
      <div className="flex-1 mr-8">
        <p style={{ fontSize: 'var(--text-subhead)', color: 'var(--text-primary)', fontWeight: 500 }}>
          {label}
        </p>
        {description && (
          <p style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {description}
          </p>
        )}
      </div>
      {control}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <PageTransition>
      <div className="min-h-screen pb-12">
        <PageHeader title="Settings" />

        <div className="px-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 items-start">
          
          {/* Section nav sidebar */}
          <GlassCard inset noPad className="sticky top-8">
            <nav className="flex flex-col py-2">
              {['General', 'Extension', 'Appearance', 'Account', 'Danger Zone'].map((section, i) => (
                <a
                  key={section}
                  href={`#${section.toLowerCase().replace(' ', '-')}`}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors text-[var(--text-subhead)] font-medium"
                >
                  {section}
                </a>
              ))}
            </nav>
          </GlassCard>

          {/* Settings panels */}
          <div className="flex flex-col gap-8">
            
            <GlassCard id="general">
              <MetaLabel>General</MetaLabel>
              <div className="mt-4 flex flex-col">
                <SettingRow
                  label="Default Mode"
                  description="Choose the primary optimization mode."
                  control={
                    <Select defaultValue="technical">
                      <SelectTrigger className="w-40 border-none bg-[rgba(255,255,255,0.04)] shadow-none h-9">
                        <SelectValue placeholder="Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                />
                <SettingRow
                  label="No-Fluff Mode"
                  description="Strictly eliminate conversational padding from prompts."
                  control={<Switch />}
                />
                <SettingRow
                  label="Auto-detect platform"
                  description="Optimize differently based on whether you are using ChatGPT or Claude."
                  control={<Switch defaultChecked />}
                />
              </div>
            </GlassCard>

            <GlassCard id="extension">
              <MetaLabel>Extension</MetaLabel>
              <div className="mt-4 flex flex-col">
                <SettingRow
                  label="Connection Status"
                  description="Indicates if the browser extension is currently active."
                  control={<span className="text-[var(--score-positive)] font-mono text-[var(--text-micro)] tracking-widest uppercase">Connected</span>}
                />
                <SettingRow
                  label="Sync Interval"
                  control={
                    <Select defaultValue="realtime">
                      <SelectTrigger className="w-40 border-none bg-[rgba(255,255,255,0.04)] shadow-none h-9">
                        <SelectValue placeholder="Interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                />
                <SettingRow
                  label="Clear Extension History"
                  description="Remove local cache from your browser."
                  control={
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost">Clear</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear local history?</AlertDialogTitle>
                          <AlertDialogDescription className="text-[var(--text-secondary)]">
                            This will clear the extension cache. Your server data will remain intact.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="btn-ghost">Cancel</AlertDialogCancel>
                          <AlertDialogAction className="btn-primary">Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  }
                />
              </div>
            </GlassCard>

            <GlassCard id="appearance">
              <MetaLabel>Appearance</MetaLabel>
              <div className="mt-4 flex flex-col">
                <SettingRow
                  label="Theme"
                  description="PromptPro uses a strictly optimized monochrome dark mode."
                  control={<span className="text-[var(--text-tertiary)] font-mono text-[var(--text-micro)] tracking-widest uppercase">Locked</span>}
                />
              </div>
            </GlassCard>

            <GlassCard id="account">
              <MetaLabel>Account</MetaLabel>
              <div className="mt-4 flex flex-col">
                <SettingRow
                  label="Display Name"
                  control={<Input defaultValue="Shreshtha" className="input-glass w-48" />}
                />
                <SettingRow
                  label="Email Address"
                  control={<span className="text-[var(--text-secondary)] font-mono text-[var(--text-subhead)]">user@example.com</span>}
                />
                <div className="py-4 mt-2">
                  <Button variant="ghost" className="text-white bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)]">Sign out</Button>
                </div>
              </div>
            </GlassCard>

            <GlassCard id="danger-zone" style={{
              border: '1px solid rgba(255,69,58,0.20)',
              background: 'rgba(255,69,58,0.04)',
            }}>
              <MetaLabel>Danger Zone</MetaLabel>
              <div className="mt-4 flex flex-col">
                <SettingRow
                  label="Delete All History"
                  description="Permanently remove all your upgraded prompt history."
                  control={
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="btn-destructive">Delete History</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription className="text-[var(--text-secondary)]">
                            This action cannot be undone. This will permanently delete your history from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="btn-ghost">Cancel</AlertDialogCancel>
                          <AlertDialogAction className="btn-destructive border-none">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  }
                />
                <SettingRow
                  label="Delete Account"
                  description="Permanently remove your account and all associated data."
                  control={
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="btn-destructive">Delete Account</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription className="text-[var(--text-secondary)]">
                            This action cannot be undone. This will permanently delete your account.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="btn-ghost">Cancel</AlertDialogCancel>
                          <AlertDialogAction className="btn-destructive border-none">Delete Account</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  }
                />
              </div>
            </GlassCard>

          </div>
        </div>
      </div>
    </PageTransition>
  )
}
