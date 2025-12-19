import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { UserError, UserStatus, UserRole } from '../data/schema'
import { usersAPI } from '../data/users'
import { useUsersStore } from '../data/users-store'

export const useUserQuery = () => {
  const queryClient = useQueryClient()
  const {
    setUsers,
    setTotalItems,
    setCurrentPage,
    setPerPage,
    setTotalPages,
    setIsLoading,
    setError,
    // setStats,
    filters,
    setOpen,
    setCurrentRow,
  } = useUsersStore()

  // Query for users
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersAPI.getUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // TODO: Query for statistics
  // const { data: stats, refetch: refetchStats } = useQuery({
  //   queryKey: ['users-stats'],
  //   queryFn: () => usersAPI.getUserStats(),
  //   staleTime: 2 * 60 * 1000, // 2 minutes
  // })

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (user: {
      name: string
      username: string
      email: string
      phoneNumber: string
      status: UserStatus
      role: UserRole
    }) => usersAPI.createUser(user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-stats'] })
      toast.success('User created successfully')
      setOpen(null)
    },
    onError: (error: UserError) => {
      toast.error(error.message || 'Failed to create user')
    },
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({
      id,
      user,
    }: {
      id: string
      user: Partial<{
        name: string
        username: string
        email: string
        phoneNumber: string
        status: UserStatus
        role: UserRole
      }>
    }) => usersAPI.updateUser(id, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-stats'] })
      toast.success('User updated successfully')
      setOpen(null)
      setCurrentRow(null)
    },
    onError: (error: UserError) => {
      toast.error(error.message || 'Failed to update user')
    },
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-stats'] })
      toast.success('User deleted successfully')
      setOpen(null)
      setCurrentRow(null)
    },
    onError: (error: UserError) => {
      toast.error(error.message || 'Failed to delete user')
    },
  })

  // Bulk delete users mutation
  const deleteUsersMutation = useMutation({
    mutationFn: (ids: string[]) => usersAPI.deleteUsers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-stats'] })
      toast.success('Users deleted successfully')
    },
    onError: (error: UserError) => {
      toast.error(error.message || 'Failed to delete users')
    },
  })

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = usersAPI.subscribeToUsers((action, user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-stats'] })

      // Show toast for real-time updates
      const actionMessages = {
        create: 'New user created',
        update: 'User updated',
        delete: 'User deleted',
      }
      toast.info(`${actionMessages[action]}: ${user.name}`)
    })

    return unsubscribe
  }, [queryClient])

  // Actions
  const createUser = async (user: {
    name: string
    username: string
    email: string
    phoneNumber: string
    status: UserStatus
    role: UserRole
  }) => {
    await createUserMutation.mutateAsync(user)
  }

  const updateUser = async (
    id: string,
    user: Partial<{
      name: string
      username: string
      email: string
      phoneNumber: string
      status: UserStatus
      role: UserRole
    }>
  ) => {
    await updateUserMutation.mutateAsync({ id, user })
  }

  const deleteUser = async (id: string) => {
    await deleteUserMutation.mutateAsync(id)
  }

  const deleteUsers = async (ids: string[]) => {
    await deleteUsersMutation.mutateAsync(ids)
  }

  // Update Zustand store with the latest data
  useEffect(() => {
    if (usersData) {
      setUsers(usersData.items)
      setTotalItems(usersData.totalItems)
      setCurrentPage(usersData.page)
      setPerPage(usersData.perPage)
      setTotalPages(usersData.totalPages)
    }
  }, [usersData])

  useEffect(() => {
    setIsLoading(isLoading)
    setError(error as Error | null)
  }, [isLoading, error])

  // useEffect(() => {
  //   setStats(stats)
  // }, [stats])

  return {
    users: usersData?.items || [],
    // stats,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    deleteUsers,
    refetch,
    // refetchStats,
  }
}
