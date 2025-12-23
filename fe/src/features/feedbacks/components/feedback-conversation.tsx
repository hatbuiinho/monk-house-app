import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Send } from 'lucide-react'
import { pb } from '@/lib/pocketbase'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useFeedbacksStore } from '../data/feedbacks-store'

export function FeedbackConversation({ taskId }: { taskId: string }) {
  const [message, setMessage] = useState('')

  const {
    feedbacks,
    isLoading,
    error,
    fetchFeedbacks,
    createFeedback,
    subscribeToFeedbacks,
  } = useFeedbacksStore()

  const currentUser = pb.authStore.record

  // Filter feedbacks for this task
  const taskFeedbacks = feedbacks.filter((f) => f.task === taskId)

  // Group feedbacks by date
  const groupedFeedbacks = taskFeedbacks.reduce(
    (acc, feedback) => {
      const date = new Date(feedback.timestamp).toDateString()
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(feedback)
      return acc
    },
    {} as Record<string, typeof taskFeedbacks>
  )

  useEffect(() => {
    // Set filter for this task and fetch feedbacks
    useFeedbacksStore.getState().setFilter({ task: taskId })
    fetchFeedbacks()

    // Subscribe to real-time updates
    const unsubscribe = subscribeToFeedbacks()

    return () => {
      unsubscribe()
    }
  }, [taskId])

  const chatContainerRef = useRef<HTMLDivElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || !currentUser) return

    try {
      await createFeedback({
        message,
        type: 'comment',
        sender: currentUser.id,
        task: taskId,
        timestamp: new Date().toISOString(),
      })

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'instant',
          block: 'end',
        })
      }, 300)
      setMessage('')
    } catch (_error) {
      // Error is handled by the store
    }
  }

  return (
    <div className='flex h-full flex-1 flex-col gap-2 rounded-md pt-0'>
      <div className='flex size-full flex-1'>
        <div className='relative -me-4 flex flex-1 flex-col overflow-y-hidden'>
          <div
            ref={chatContainerRef}
            className='flex w-full grow flex-col-reverse justify-start gap-4 overflow-y-scroll pe-4'
          >
            <>
              <div className='size-full grow overflow-y-scroll'>
                {Object.keys(groupedFeedbacks).map((date) => (
                  <div key={date} className='flex flex-col gap-2'>
                    {groupedFeedbacks[date].map((feedback, index) => {
                      const isCurrentUser =
                        feedback.sender &&
                        (typeof feedback.sender === 'object'
                          ? feedback.sender.id === currentUser?.id
                          : feedback.sender === currentUser?.id)

                      const senderName =
                        typeof feedback.sender === 'object'
                          ? feedback.sender.name
                          : 'Unknown User'

                      const senderAvatarUrl =
                        typeof feedback.sender === 'object'
                          ? feedback.sender.avatar_url
                          : ''

                      return (
                        <div
                          key={`${feedback.id}-${index}`}
                          className={cn(
                            'flex items-start gap-2',
                            isCurrentUser ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {!isCurrentUser && (
                            <Avatar className='mt-1 h-8 w-8'>
                              <AvatarImage
                                src={senderAvatarUrl}
                                alt={senderName}
                              />
                              <AvatarFallback className='rounded-full'>
                                {senderName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              'chat-box max-w-72 px-3 py-2 wrap-break-word shadow-lg',
                              isCurrentUser
                                ? 'bg-primary/90 text-primary-foreground/75 self-end rounded-[16px_16px_0_16px]'
                                : 'bg-muted self-start rounded-[16px_16px_16px_0]'
                            )}
                          >
                            {!isCurrentUser && (
                              <div className='mb-1 text-sm font-medium'>
                                {senderName}
                              </div>
                            )}
                            <div
                              className='whitespace-pre-wrap'
                              dangerouslySetInnerHTML={{
                                __html: feedback.message,
                              }}
                            ></div>
                            <span
                              className={cn(
                                'text-foreground/75 mt-1 block text-xs font-light italic',
                                isCurrentUser &&
                                  'text-primary-foreground/85 text-end'
                              )}
                            >
                              {format(new Date(feedback.timestamp), 'h:mm a')}
                            </span>
                          </div>
                          {isCurrentUser && (
                            <Avatar className='mt-1 h-8 w-8'>
                              <AvatarImage
                                src={senderAvatarUrl}
                                alt={senderName}
                              />
                              <AvatarFallback className='rounded-full'>
                                {senderName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )
                    })}
                    <div className='text-muted-foreground text-center text-xs'>
                      {date}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </>
            <div
              className={cn('flex items-center justify-center py-4', {
                hidden: !isLoading,
              })}
            >
              <div className='border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent'></div>
            </div>

            <div className={cn('text-center text-red-500', { hidden: !error })}>
              {error}
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className='fixed right-20 bottom-2 left-2 flex flex-none items-center gap-2'
      >
        <div className='border-input bg-card focus-within:ring-ring flex flex-1 items-center gap-2 rounded-md border px-2 py-1 focus-within:ring-1 focus-within:outline-hidden lg:gap-4'>
          {/* TODO: add feature for feedback */}
          {/* <div className='space-x-1'>
            <Button
              size='icon'
              type='button'
              variant='ghost'
              className='hidden h-8 rounded-md lg:inline-flex'
            >
              <Plus size={20} className='stroke-muted-foreground' />
            </Button>
            <Button
              size='icon'
              type='button'
              variant='ghost'
              className='hidden h-8 rounded-md lg:inline-flex'
            >
              <ImagePlus size={20} className='stroke-muted-foreground' />
            </Button>
            <Button
              size='icon'
              type='button'
              variant='ghost'
              className='hidden h-8 rounded-md lg:inline-flex'
            >
              <Paperclip size={20} className='stroke-muted-foreground' />
            </Button>
          </div> */}
          <label className='flex-1'>
            <span className='sr-only'>Feedback Text Box</span>
            <input
              type='text'
              placeholder='Tin nhắn...'
              className='h-8 w-full bg-inherit focus-visible:outline-hidden'
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!currentUser}
            />
          </label>
          <Button
            variant='ghost'
            size='icon'
            className='hidden sm:inline-flex'
            type='submit'
            disabled={!message.trim() || !currentUser}
          >
            <Send size={20} />
          </Button>
        </div>
        <Button
          className='h-full sm:hidden'
          type='submit'
          disabled={!message.trim() || !currentUser}
        >
          <Send size={18} />
        </Button>
      </form>

      {!currentUser && (
        <div className='text-muted-foreground mt-2 text-center text-sm'>
          Please sign in to send feedback
        </div>
      )}
    </div>
  )
}
