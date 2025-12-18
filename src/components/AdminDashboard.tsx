'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HomepageRowsAdmin } from '@/components/HomepageRowsAdmin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, UserPlus, Shield, Ban, Unlock, Trash2, Key, Check, X, Clock3, Coins } from 'lucide-react';
import { toast } from 'sonner';

type AdminRole = 'user' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  banned: boolean;
  banReason?: string;
  banExpires?: string;
  createdAt: string;
}

type RawUser = Omit<User, 'role'> & { role?: string | null | undefined };

interface CreateFormState {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
}

const normalizeRole = (role?: string | null): AdminRole => (role === 'admin' ? 'admin' : 'user');

const normalizeUser = (user: RawUser): User => ({
  ...user,
  role: normalizeRole(user.role),
});

const createInitialFormState = (): CreateFormState => ({
  email: '',
  password: '',
  name: '',
  role: 'user',
});

interface ListUsersResponse {
  users: RawUser[];
  total: number;
  limit?: number;
  offset?: number;
}

interface AgentRequest {
  tag: string;
  name: string;
  creatorId: string | null;
  visibility: string | null;
  publishStatus: 'draft' | 'pending_review' | 'approved' | 'rejected';
  publishRequestedAt?: string | null;
  publishRequestedBy?: string | null;
  publishReviewNotes?: string | null;
  tagline?: string | null;
  model?: string | null;
}

interface CreditLedgerEntry {
  id: string;
  amountCents: number;
  entryType: string;
  status: string;
  reason: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'email' | 'name'>('email');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogType, setDialogType] = useState<'role' | 'ban' | 'password' | 'create' | 'credits' | null>(null);
  const [roleValue, setRoleValue] = useState<AdminRole>('user');
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('7');
  const [newPassword, setNewPassword] = useState('');
  const [createForm, setCreateForm] = useState<CreateFormState>(createInitialFormState());
  const [agentRequests, setAgentRequests] = useState<AgentRequest[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [creditLedger, setCreditLedger] = useState<CreditLedgerEntry[]>([]);
  const [isCreditLoading, setIsCreditLoading] = useState(false);
  const [isCreditSaving, setIsCreditSaving] = useState(false);

  const pageSize = 10;
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    []
  );

  const parseAmountToCents = (value: string) => {
    const normalized = value.trim().replace(/[$,]/g, '');
    if (!normalized) return null;
    if (!/^-?\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
    const isNegative = normalized.startsWith('-');
    const unsigned = isNegative ? normalized.slice(1) : normalized;
    const [whole, fraction = ''] = unsigned.split('.');
    const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, '0'), 10);
    if (!Number.isSafeInteger(cents)) return null;
    return isNegative ? -cents : cents;
  };

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authClient.admin.listUsers({
        query: {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          searchValue: searchQuery || undefined,
          searchField: searchQuery ? searchField : undefined,
          sortBy: 'createdAt',
          sortDirection: 'desc',
        },
      });

      const data = response.data as ListUsersResponse | null;
      if (data) {
        setUsers(data.users.map(normalizeUser));
        setTotal(data.total);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchField, searchQuery]);

  const loadAgentRequests = useCallback(async () => {
    setIsLoadingAgents(true);
    try {
      const res = await fetch('/api/admin/agent-approvals?status=pending_review', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load agent approvals');
      const data = await res.json();
      const normalized: AgentRequest[] = Array.isArray(data?.requests)
        ? data.requests.map((r: AgentRequest) => ({
            tag: r.tag,
            name: r.name,
            creatorId: r.creatorId ?? null,
            visibility: r.visibility ?? null,
            publishStatus: r.publishStatus,
            publishRequestedAt: r.publishRequestedAt ?? null,
            publishRequestedBy: r.publishRequestedBy ?? null,
            publishReviewNotes: r.publishReviewNotes ?? null,
            tagline: r.tagline ?? null,
            model: r.model ?? null,
          }))
        : [];
      setAgentRequests(normalized);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load agent approvals');
    } finally {
      setIsLoadingAgents(false);
    }
  }, []);

  const loadCreditsForUser = useCallback(async (userId: string) => {
    setIsCreditLoading(true);
    try {
      const res = await fetch(`/api/admin/credits/account?userId=${encodeURIComponent(userId)}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load credits');
      const data = await res.json();
      setCreditBalance(data?.account?.balanceCents ?? null);
      setCreditLedger(Array.isArray(data?.ledger) ? data.ledger : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load credit balance');
    } finally {
      setIsCreditLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);
  useEffect(() => {
    void loadAgentRequests();
  }, [loadAgentRequests]);
  useEffect(() => {
    if (dialogType === 'credits' && selectedUser?.id) {
      void loadCreditsForUser(selectedUser.id);
    }
  }, [dialogType, selectedUser?.id, loadCreditsForUser]);

  function handleSearch() {
    setCurrentPage(1);
    setSearchQuery(searchValue);
  }

  async function handleAdjustCredits() {
    if (!selectedUser) return;
    const amountCents = parseAmountToCents(creditAmount);
    if (amountCents == null || amountCents === 0) {
      toast.error('Enter a non-zero amount in USD');
      return;
    }
    const reason = creditReason.trim();
    if (!reason) {
      toast.error('Reason is required');
      return;
    }

    setIsCreditSaving(true);
    try {
      const res = await fetch('/api/admin/credits/adjust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          amountCents,
          reason,
          note: creditNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || 'Failed to adjust credits');
      }
      const data = await res.json();
      setCreditBalance(typeof data?.balanceCents === 'number' ? data.balanceCents : creditBalance);
      setCreditAmount('');
      setCreditReason('');
      setCreditNote('');
      await loadCreditsForUser(selectedUser.id);
      toast.success('Credits updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to adjust credits');
    } finally {
      setIsCreditSaving(false);
    }
  }

  const closeCreditDialog = () => {
    setDialogType(null);
    setCreditAmount('');
    setCreditReason('');
    setCreditNote('');
    setCreditLedger([]);
    setCreditBalance(null);
  };

  async function handleSetRole(userId: string, role: AdminRole) {
    try {
      await authClient.admin.setRole({
        userId,
        role,
      });
      toast.success('Role updated successfully');
      await loadUsers();
      setDialogType(null);
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to update role');
      console.error(error);
    }
  }

  async function handleBanUser(userId: string) {
    try {
      const banExpiresIn = parseInt(banDays) * 24 * 60 * 60; // Convert days to seconds
      await authClient.admin.banUser({
        userId,
        banReason: banReason || 'No reason provided',
        banExpiresIn,
      });
      toast.success('User banned successfully');
      await loadUsers();
      setDialogType(null);
      setSelectedUser(null);
      setBanReason('');
      setBanDays('7');
    } catch (error) {
      toast.error('Failed to ban user');
      console.error(error);
    }
  }

  async function handleUnbanUser(userId: string) {
    try {
      await authClient.admin.unbanUser({ userId });
      toast.success('User unbanned successfully');
      await loadUsers();
    } catch (error) {
      toast.error('Failed to unban user');
      console.error(error);
    }
  }

  async function handleSetPassword(userId: string) {
    try {
      await authClient.admin.setUserPassword({
        userId,
        newPassword,
      });
      toast.success('Password updated successfully');
      await loadUsers();
      setDialogType(null);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error('Failed to update password');
      console.error(error);
    }
  }

  async function handleCreateUser() {
    try {
      await authClient.admin.createUser({
        email: createForm.email,
        password: createForm.password,
        name: createForm.name,
        role: createForm.role,
        data: {},
      });
      toast.success('User created successfully');
      await loadUsers();
      setDialogType(null);
      setCreateForm(createInitialFormState());
    } catch (error) {
      toast.error('Failed to create user');
      console.error(error);
    }
  }

  async function handleAgentDecision(tag: string, action: 'approve' | 'reject') {
    try {
      let notes: string | undefined;
      if (action === 'reject') {
        notes = typeof window !== 'undefined' ? window.prompt('Optional rejection reason?') ?? '' : '';
      }
      const res = await fetch('/api/admin/agent-approvals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tag, action, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Unable to update agent');
      }
      toast.success(action === 'approve' ? 'Agent approved for public' : 'Agent rejected');
      await loadAgentRequests();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update agent approval');
    }
  }

  async function handleRemoveUser(userId: string) {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    
    try {
      await authClient.admin.removeUser({ userId });
      toast.success('User removed successfully');
      await loadUsers();
    } catch (error) {
      toast.error('Failed to remove user');
      console.error(error);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="agents">Agent approvals</TabsTrigger>
          <TabsTrigger value="homepage">Homepage rows</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">User directory</p>
                <p className="text-xs text-muted-foreground">
                  Search, filter, and act on users. Actions stay tucked in the kebab menu.
                </p>
              </div>
              <Button onClick={() => setDialogType('create')}>
                <UserPlus className="size-4 mr-2" />
                Create user
              </Button>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex items-center gap-2">
                <Select value={searchField} onValueChange={(value) => setSearchField(value as 'email' | 'name')}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search by ${searchField}...`}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button variant="secondary" onClick={handleSearch}>
                  Apply
                </Button>
              </div>
              <div className="text-xs text-muted-foreground md:text-right md:ml-auto">
                Keep filters light—only showing what you ask for.
              </div>
            </div>
          </Card>

          <Card className="border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setRoleValue(user.role);
                                setDialogType('role');
                              }}
                            >
                              <Shield className="size-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setDialogType('password');
                              }}
                            >
                              <Key className="size-4 mr-2" />
                              Set Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setDialogType('credits');
                              }}
                            >
                              <Coins className="size-4 mr-2" />
                              Adjust Credits
                            </DropdownMenuItem>
                            {user.banned ? (
                              <DropdownMenuItem onClick={() => handleUnbanUser(user.id)}>
                                <Unlock className="size-4 mr-2" />
                                Unban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDialogType('ban');
                                }}
                              >
                                <Ban className="size-4 mr-2" />
                                Ban User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemoveUser(user.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="size-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total} users
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card className="p-4 space-y-2">
            <p className="text-sm font-medium">Public listing requests</p>
            <p className="text-xs text-muted-foreground">
              Approve or reject agents requesting public visibility. Approved agents will appear in search and homepage slots.
            </p>
          </Card>

          <Card className="border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Requested at</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[160px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAgents ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading requests...
                    </TableCell>
                  </TableRow>
                ) : agentRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No pending requests
                    </TableCell>
                  </TableRow>
                ) : (
                  agentRequests.map((req) => {
                    const requestedAt = req.publishRequestedAt ? new Date(req.publishRequestedAt) : null;
                    return (
                      <TableRow key={req.tag}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{req.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{req.tag}</span>
                            {req.tagline ? (
                              <span className="text-xs text-muted-foreground line-clamp-1">{req.tagline}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{req.creatorId || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {requestedAt ? `${requestedAt.toLocaleDateString()} ${requestedAt.toLocaleTimeString()}` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            {req.publishStatus === 'pending_review' ? <Clock3 className="size-4" /> : null}
                            {req.publishStatus.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleAgentDecision(req.tag, 'reject')}>
                              <X className="size-4 mr-1" />
                              Reject
                            </Button>
                            <Button size="sm" onClick={() => handleAgentDecision(req.tag, 'approve')}>
                              <Check className="size-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="homepage">
          <HomepageRowsAdmin />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={dialogType === 'role'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={roleValue} onValueChange={(value) => setRoleValue(normalizeRole(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={() => selectedUser && handleSetRole(selectedUser.id, roleValue)}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'ban'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Ban {selectedUser?.name} from accessing the application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                placeholder="Spamming, abuse, etc."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input
                type="number"
                placeholder="7"
                value={banDays}
                onChange={(e) => setBanDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty for permanent ban</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && handleBanUser(selectedUser.id)}
            >
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'password'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUser && handleSetPassword(selectedUser.id)}
              disabled={!newPassword}
            >
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'credits'} onOpenChange={(open) => !open && closeCreditDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adjust Credits</DialogTitle>
            <DialogDescription>
              Update balance for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border px-3 py-2 text-sm">
              <div className="text-muted-foreground">Current balance</div>
              <div className="text-lg font-semibold">
                {isCreditLoading || creditBalance == null
                  ? 'Loading...'
                  : currencyFormatter.format(creditBalance / 100)}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount (USD, use negative to deduct)</Label>
                <Input
                  placeholder="10.00 or -5.00"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  placeholder="Manual adjustment"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Internal note (optional)</Label>
              <Input
                placeholder="Short note for audit"
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Recent ledger entries</Label>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isCreditLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Loading ledger...
                        </TableCell>
                      </TableRow>
                    ) : creditLedger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No ledger entries yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      creditLedger.map((entry) => {
                        const isPositive = entry.amountCents >= 0;
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell className="capitalize">{entry.entryType.replace('_', ' ')}</TableCell>
                            <TableCell className="text-muted-foreground">{entry.reason}</TableCell>
                            <TableCell className={`text-right ${isPositive ? 'text-emerald-600' : 'text-destructive'}`}>
                              {isPositive ? '+' : '-'}
                              {currencyFormatter.format(Math.abs(entry.amountCents) / 100)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreditDialog}>
              Cancel
            </Button>
            <Button onClick={handleAdjustCredits} disabled={isCreditSaving}>
              Apply adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'create'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="John Doe"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Enter password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, role: normalizeRole(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={!createForm.email || !createForm.password || !createForm.name}
            >
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
