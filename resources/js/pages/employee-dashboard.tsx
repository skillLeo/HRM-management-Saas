import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { RefreshCw, Bell, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { usePage, router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { format } from 'date-fns';
import { hasPermission } from '@/utils/authorization';

interface LeaveBalance {
  leave_type: string;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  color: string;
}

interface EmployeeDashboardData {
  stats: {
    totalAwards: number;
    totalWarnings: number;
    totalComplaints: number;
  };
  leaveBalances: LeaveBalance[];
  recentActivities: {
    announcements: Array<any>;
    meetings: Array<any>;
  };
  userType: string;
}

interface PageAction {
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick: () => void;
}

export default function EmployeeDashboard({ dashboardData }: { dashboardData: EmployeeDashboardData }) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const attendance = dashboardData?.todayAttendance;
    if (attendance) {
      if (attendance.clock_in) {
        setClockInTime(new Date(`1970-01-01T${attendance.clock_in}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
        setIsClockedIn(!attendance.clock_out);
      }
      if (attendance.clock_out) {
        setClockOutTime(new Date(`1970-01-01T${attendance.clock_out}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
      }
    }

    // Auto refresh to check for auto clock out
    const checkAutoClockOut = () => {
      const shift = dashboardData?.employeeShift;
      const attendance = dashboardData?.todayAttendance;

      if (shift && attendance?.clock_in && !attendance?.clock_out && isClockedIn) {
        const now = new Date();
        const shiftEnd = new Date(`1970-01-01T${shift.end_time}`);
        const currentTime = new Date(`1970-01-01T${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`);

        if (currentTime > shiftEnd) {
          window.location.reload();
        }
      }
    };

    const interval = setInterval(checkAutoClockOut, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [dashboardData, isClockedIn]);

  const handleClockIn = () => {
    toast.loading(t('Clocking in...'));

    router.post(route('hr.attendance.clock-in'), {
      employee_id: auth.user.id
    }, {
      onSuccess: (page) => {
        toast.dismiss();
        if (page.props.flash?.success) {
          setIsClockedIn(true);
          setClockInTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
          toast.success(t(page.props.flash.success));
        } else {
          toast.error(t(page.props.flash.error || 'Failed to clock in'));
        }
      },
      onError: (errors, page) => {
        toast.dismiss();
        if (page?.props?.flash?.error) {
          toast.error(t(page.props.flash.error));
        } else if (typeof errors === 'string') {
          toast.error(errors);
        } else if (errors && Object.keys(errors).length > 0) {
          const firstError = Object.values(errors)[0];
          toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          toast.error(t('Failed to clock in. Please try again.'));
        }
      }
    });
  };

  const handleClockOut = () => {
    toast.loading(t('Clocking out...'));

    router.post(route('hr.attendance.clock-out'), {
      employee_id: auth.user.id
    }, {
      onSuccess: (page) => {
        toast.dismiss();
        if (page.props.flash?.success) {
          setIsClockedIn(false);
          setClockOutTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
          toast.success(t(page.props.flash.success));
        } else {
          toast.error(t(page.props.flash.error || 'Failed to clock out'));
        }
      },
      onError: (errors, page) => {
        toast.dismiss();
        if (page?.props?.flash?.error) {
          toast.error(t(page.props.flash.error));
        } else if (typeof errors === 'string') {
          toast.error(errors);
        } else if (errors && Object.keys(errors).length > 0) {
          const firstError = Object.values(errors)[0];
          toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          toast.error(t('Failed to clock out. Please try again.'));
        }
      }
    });
  };

  const pageActions: PageAction[] = [
    {
      label: t('Refresh'),
      icon: <RefreshCw className="h-4 w-4" />,
      variant: 'outline',
      onClick: () => window.location.reload()
    }
  ];

  const stats = dashboardData?.stats || {
    totalAwards: 0,
    totalWarnings: 0,
    totalComplaints: 0
  };

  const recentActivities = dashboardData?.recentActivities || {
    announcements: [],
    meetings: []
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'approved': 'bg-green-50 text-green-700 ring-green-600/20',
      'pending': 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
      'rejected': 'bg-red-50 text-red-700 ring-red-600/20'
    };
    return colors[status] || 'bg-gray-50 text-gray-700 ring-gray-600/20';
  };

  return (
    <PageTemplate
      title={t('Dashboard')}
      url="/dashboard"
      actions={pageActions}
    >
      <div className="space-y-6">
        {/* Welcome Message */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Welcome, {auth.user?.name}!</h1>
              <p className="text-muted-foreground">Stay updated with company announcements and meetings</p>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5" />
              {t('Leave Balance')} — {new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.leaveBalances?.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {dashboardData.leaveBalances.map((balance, index) => {
                  const usedPct = balance.allocated_days > 0
                    ? Math.min(100, Math.round((balance.used_days / balance.allocated_days) * 100))
                    : 0;
                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{balance.leave_type}</p>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                          style={{ backgroundColor: balance.color || '#4F46E5' }}
                        >
                          {balance.remaining_days} {t('days left')}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${usedPct}%`, backgroundColor: balance.color || '#4F46E5' }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('Used')}: {balance.used_days}</span>
                        <span>{t('Total')}: {balance.allocated_days}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('No leave balances allocated for this year')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clock In/Out Card */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-4">{t('Attendance')}</h2>

              {/* Shift Information */}
              {dashboardData?.employeeShift && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">
                    {dashboardData.employeeShift.name} {dashboardData.employeeShift.start_time} to {dashboardData.employeeShift.end_time}
                  </p>
                </div>
              )}

              {/* Clock In/Out Buttons */}
              {hasPermission(permissions, 'clock-in-out') && (
                <div className="flex justify-center gap-4 mb-6">
                  <button
                    className={`flex items-center justify-center px-8 py-4 rounded-lg font-semibold transition-colors shadow-md ${isClockedIn
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    onClick={handleClockIn}
                    disabled={isClockedIn}
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    {t('Clock In')}
                  </button>

                  <button
                    className={`flex items-center justify-center px-8 py-4 rounded-lg font-semibold transition-colors shadow-md ${!isClockedIn
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    onClick={handleClockOut}
                    disabled={!isClockedIn}
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t('Clock Out')}
                  </button>
                </div>
              )}

              {/* Clock Times Display */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 font-medium mb-1">{t('Clock In Time')}</p>
                  <p className="text-lg font-bold text-green-800">{clockInTime || '--:-- --'}</p>
                  <p className="text-xs text-green-600">{clockInTime ? 'Today' : 'Not clocked in'}</p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-red-600 font-medium mb-1">{t('Clock Out Time')}</p>
                  <p className="text-lg font-bold text-red-800">{clockOutTime || '--:-- --'}</p>
                  <p className="text-xs text-red-600">{clockOutTime ? 'Today' : 'Not clocked out'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t('Recent Announcements')}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{recentActivities.announcements.length}</Badge>
                  <button
                    onClick={() => window.location.href = route('hr.announcements.index')}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium transition-colors"
                  >
                    {t('View All')}
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities.announcements.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {recentActivities.announcements.map((announcement, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{announcement.title}</p>
                          {announcement.is_high_priority && (
                            <Badge variant="outline" className="text-xs ring-1 ring-inset bg-red-50 text-red-700 ring-red-600/20">
                              High Priority
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {announcement.category} • {(() => {
                            try {
                              return announcement.created_at ? format(new Date(announcement.created_at), 'MMM dd, yyyy') : 'N/A';
                            } catch {
                              return 'Invalid date';
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('No recent announcements')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Meetings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('Recent Meetings')}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{recentActivities.meetings.length}</Badge>
                  <button
                    onClick={() => window.location.href = route('meetings.meetings.index')}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium transition-colors"
                  >
                    {t('View All')}
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities.meetings.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {recentActivities.meetings.map((meeting, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{meeting.title}</p>
                          <Badge variant="outline" className={`text-xs ring-1 ring-inset ${getStatusColor(meeting.status)}`}>
                            {meeting.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            try {
                              if (!meeting.meeting_date) return 'No date set';
                              const date = new Date(meeting.meeting_date);
                              if (isNaN(date.getTime())) return 'Invalid date';
                              const dateStr = format(date, 'MMM dd, yyyy');
                              const timeStr = meeting.start_time && meeting.end_time ? ` • ${meeting.start_time} - ${meeting.end_time}` : '';
                              return dateStr + timeStr;
                            } catch {
                              return 'Invalid date';
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('No recent meetings')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}