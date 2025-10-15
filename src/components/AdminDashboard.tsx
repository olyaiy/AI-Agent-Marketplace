'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, UserPlus, Shield, Ban, Unlock, Trash2, Key } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason?: string;
  banExpires?: string;
  createdAt: string;
}

interface ListUsersResponse {
  users: User[];
  total: number;
  limit?: number;
  offset?: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [searchField, setSearchField] = useState<'email' | 'name'>('email');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogType, setDialogType] = useState<'role' | 'ban' | 'password' | 'create' | null>(null);
  const [roleValue, setRoleValue] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('7');
  const [newPassword, setNewPassword] = useState('');
  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '', role: 'user' });

  const pageSize = 10;

  async function loadUsers() {
    setIsLoading(true);
    try {
      const response = await authClient.admin.listUsers({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchValue: searchValue || undefined,
        searchField: searchValue ? searchField : undefined,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      const data = response.data as ListUsersResponse | null;
      if (data) {
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchField]);

  function handleSearch() {
    setCurrentPage(1);
    loadUsers();
  }

  async function handleSetRole(userId: string, role: string) {
    try {
      await authClient.admin.setRole({
        userId,
        role,
      });
      toast.success('Role updated successfully');
      loadUsers();
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
      loadUsers();
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
      loadUsers();
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
      loadUsers();
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
      loadUsers();
      setDialogType(null);
      setCreateForm({ email: '', password: '', name: '', role: 'user' });
    } catch (error) {
      toast.error('Failed to create user');
      console.error(error);
    }
  }

  async function handleRemoveUser(userId: string) {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    
    try {
      await authClient.admin.removeUser({ userId });
      toast.success('User removed successfully');
      loadUsers();
    } catch (error) {
      toast.error('Failed to remove user');
      console.error(error);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="flex-1 flex gap-2">
          <Select value={searchField} onValueChange={(value) => setSearchField(value as 'email' | 'name')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={`Search by ${searchField}...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>
        <Button onClick={() => setDialogType('create')}>
          <UserPlus className="size-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
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
      </div>

      {/* Pagination */}
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
              <Select value={roleValue} onValueChange={setRoleValue}>
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
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Enter password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={createForm.role} onValueChange={(value) => setCreateForm({ ...createForm, role: value })}>
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

