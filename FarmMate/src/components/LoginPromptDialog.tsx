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
            작업 추가·수정 등 데이터를 저장하려면 Google 계정으로 로그인해 주세요. 둘러보기는 로그인 없이
            가능합니다.
          </DialogDescription>
        </DialogHeader>
        <GoogleLoginButton className="mt-2">Google 계정으로 로그인</GoogleLoginButton>
      </DialogContent>
    </Dialog>
  )
}
