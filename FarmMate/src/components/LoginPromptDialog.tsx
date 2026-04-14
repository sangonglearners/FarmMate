import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GoogleLoginButton } from '@/components/GoogleLoginButton'
import { useAuth } from '@/contexts/AuthContext'
import { useLoginPrompt } from '@/contexts/LoginPromptContext'

export function LoginPromptDialog() {
  const { user } = useAuth()
  const { open, setOpen } = useLoginPrompt()

  useEffect(() => {
    if (user) {
      setOpen(false)
    }
  }, [user, setOpen])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>로그인이 필요합니다</DialogTitle>
          <DialogDescription>
            저장하려면 Google로 로그인해 주세요. 화면만 볼 때는 로그인 없이 돼요.
          </DialogDescription>
        </DialogHeader>
        <GoogleLoginButton className="mt-2">Google 계정으로 로그인</GoogleLoginButton>
      </DialogContent>
    </Dialog>
  )
}
