import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../lib/youbase';
import { useStore } from '../store';
import { offlineManager } from '../lib/offline';
import { LogOut, Shield, User, Search, AlertTriangle, CheckCircle, Eye, Users, FileWarning, MessageCircle, X, Filter, Calendar, Info, CheckSquare, WifiOff, RefreshCw } from 'lucide-react';

const SECTIONS = [
  "12- Bantillan",
  "12- Capillas",
  "12- Congson",
  "12- Esteban",
  "12- Nualda",
  "12- Tubao",
  "11- Asmolo",
  "11- Bautista",
  "11- De Gracia",
  "11- Esteban",
  "11- Galzote",
  "11- Gornez",
  "11- Lorenzo",
  "11- Orpilla",
  "11- Oserio",
  "11- Tayoto"
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { appUser, setAppUser, originalRole, resetRole } = useStore();
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      offlineManager.sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load of pending actions
    setPendingActions(offlineManager.getQueue());

    // Poll for queue changes (since we don't have a subscription model for localStorage)
    const interval = setInterval(() => {
      setPendingActions(offlineManager.getQueue());
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      const session = await client.auth.getSession();
      if (!session.data?.user) {
        navigate('/');
        return;
      }

      if (!appUser) {
        const res = await client.api.fetch('/api/me');
        const data = await res.json();
        if (data.user?.appUser) {
          setAppUser(data.user.appUser);
        } else {
          navigate('/setup');
          return;
        }
      }
      setLoading(false);
    };
    init();
  }, [appUser, navigate, setAppUser]);

  const handleLogout = async () => {
    await client.auth.signOut();
    setAppUser(null);
    navigate('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          You are currently offline. Actions will be queued and synced when connection is restored.
        </div>
      )}
      {isOnline && pendingActions.length > 0 && (
        <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Syncing {pendingActions.length} pending actions...
        </div>
      )}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="font-bold text-slate-900 hidden sm:block">SENTINEL WATCHTOWER</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{appUser?.role} ACCESS</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="w-4 h-4" />
            {appUser?.fullName}
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Welcome, {appUser?.fullName}</h2>
          <p className="text-slate-500">Dashboard Overview</p>
        </div>

        {appUser?.role === 'student' && <StudentView />}
        {appUser?.role === 'adviser' && <AdviserView />}
        {['teacher', 'prefect'].includes(appUser?.role || '') && <PrefectTeacherView role={appUser?.role} />}
        {appUser?.role === 'developer' && <DeveloperView />}
      </main>

      {originalRole === 'developer' && appUser?.role !== 'developer' && (
        <button 
          onClick={resetRole} 
          className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl z-50 font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors"
        >
          <Eye className="w-4 h-4" />
          EXIT PREVIEW MODE
        </button>
      )}
      
      {/* Points System Reference Button - Available for all roles */}
      <button 
        onClick={() => {
          alert(`Points System Reference:\n\n0-3 Points: GOOD STANDING ✅\n4-6 Points: WARNING ⚠️\n7-9 Points: HIGH ALERT 🚨\n10+ Points: DISCIPLINARY HOLD 🔒\n\nResolved infractions are subtracted from your total.`);
        }}
        className="fixed bottom-6 left-6 bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg z-50 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-700 transition-colors opacity-80 hover:opacity-100"
      >
        <Info className="w-3 h-3" />
        Points Guide
      </button>
    </div>
  );
}

function StudentView() {
  const [infractions, setInfractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInfraction, setSelectedInfraction] = useState<any>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInfractions();
  }, []);

  const loadInfractions = async () => {
    try {
      const res = await client.api.fetch('/api/infractions');
      const data = await res.json();
      setInfractions(data.infractions || []);
      offlineManager.cacheData('student_infractions', data.infractions);
    } catch (e) {
      const cached = offlineManager.getCachedData('student_infractions');
      if (cached) setInfractions(cached);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedInfraction || !responseText.trim()) return;
    setSubmitting(true);

    try {
      if (!navigator.onLine) {
        offlineManager.addToQueue('SUBMIT_EXPLANATION', {
          infractionId: selectedInfraction.id,
          explanation: responseText.trim()
        });
        alert('Explanation saved offline. It will be submitted when you are back online.');
      } else {
        await client.api.fetch(`/api/infractions/${selectedInfraction.id}/explanation`, {
          method: 'POST',
          body: JSON.stringify({ explanation: responseText.trim() })
        });
        alert('Explanation submitted successfully');
      }

      setSelectedInfraction(null);
      setResponseText('');
      loadInfractions();
    } catch (err) {
      alert('Failed to submit explanation. You may have already submitted one.');
    }
    setSubmitting(false);
  };

  // Calculate total points excluding resolved infractions
  const totalPoints = infractions.reduce((acc, curr) => !curr.resolved ? acc + curr.points : acc, 0);
  
  // New point ranges: 0-3 good standing, 4-6 warning, 7-10 high alert, 10+ disciplinary hold
  const getStatus = (points: number) => {
    if (points >= 10) return 'DISCIPLINARY HOLD';
    if (points >= 7) return 'HIGH ALERT';
    if (points >= 4) return 'WARNING';
    return 'GOOD STANDING';
  };
  
  const getStatusColor = (points: number) => {
    if (points >= 10) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (points >= 7) return 'bg-red-100 text-red-700 border-red-200';
    if (points >= 4) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };
  
  const status = getStatus(totalPoints);
  const statusColor = getStatusColor(totalPoints);

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-xl border ${statusColor} flex items-center justify-between`}>
        <div>
          <h2 className="text-lg font-bold">STATUS: {status}</h2>
          <p className="text-sm opacity-80">Current Points: {totalPoints}</p>
        </div>
        {totalPoints >= 10 ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-700">Infraction History</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading records...</div>
        ) : infractions.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No infractions recorded. Keep it up!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4 font-medium">Offense</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Points</th>
                  <th className="p-4 font-medium">Issuer</th>
                  <th className="p-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {infractions.map((inf) => (
                  <tr key={inf.id} className={`hover:bg-slate-50 ${inf.resolved ? 'opacity-50' : ''}`}>
                    <td className="p-4 font-medium text-slate-900">{inf.offense}</td>
                    <td className="p-4 uppercase text-xs tracking-wider">{inf.type}</td>
                    <td className="p-4 font-bold text-slate-700">
                      {inf.resolved ? (
                        <span className="line-through text-slate-400">{inf.points}</span>
                      ) : (
                        <span>{inf.points}</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">{inf.issuerName}</td>
                    <td className="p-4">
                      {inf.resolved ? (
                        <span className="text-green-600 text-xs flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedInfraction(inf)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInfraction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-slate-900">Infraction Details</h3>
              <button onClick={() => setSelectedInfraction(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-lg space-y-2">
              <div>
                <div className="text-xs text-slate-500">Offense</div>
                <div className="font-bold text-slate-900">{selectedInfraction.offense}</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-slate-500">Type</div>
                  <div className="text-sm font-medium uppercase tracking-wider">{selectedInfraction.type}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Points</div>
                  <div className="text-sm font-bold">{selectedInfraction.points}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Date Issued</div>
                <div className="text-sm">{new Date(selectedInfraction.dateIssued * 1000).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Issued By</div>
                <div className="text-sm">{selectedInfraction.issuerName}</div>
              </div>
              {selectedInfraction.description && (
                <div>
                  <div className="text-xs text-slate-500">Description</div>
                  <div className="text-sm">{selectedInfraction.description}</div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Student Explanation
              </label>
              {selectedInfraction.explanationSubmittedAt ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-slate-700 mb-2">{selectedInfraction.studentExplanation}</div>
                  <div className="text-xs text-green-600">
                    ✓ Submitted on {new Date(selectedInfraction.explanationSubmittedAt * 1000).toLocaleString()}
                  </div>
                </div>
              ) : (
                <>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32 mb-2"
                    placeholder="Explain your side or provide context for this infraction..."
                    disabled={submitting}
                  />
                  <button
                    onClick={handleSubmitResponse}
                    disabled={submitting || !responseText.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
                  >
                    {submitting ? 'Submitting...' : 'Submit Explanation'}
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedInfraction(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Student Profile Modal Component
function StudentProfileModal({ student, onClose, onRefresh }: { student: any, onClose: () => void, onRefresh: () => void }) {
  const [infractions, setInfractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  useEffect(() => {
    loadStudentProfile();
  }, [student.id]);

  const loadStudentProfile = async () => {
    setLoading(true);
    const res = await client.api.fetch(`/api/students/${student.id}/profile`);
    const data = await res.json();
    setInfractions(data.infractions || []);
    setTotalPoints(data.totalPoints || 0);
    setLoading(false);
  };

  const handleResolveInfraction = async (infractionId: number) => {
    if (!confirm('Are you sure you want to resolve this infraction?')) return;
    
    if (resolvingId) return;
    setResolvingId(infractionId);
    
    try {
      await client.api.fetch(`/api/infractions/${infractionId}/resolve`, {
        method: 'PATCH'
      });
      alert('Infraction resolved successfully');
      loadStudentProfile();
      onRefresh();
    } catch (err) {
      alert('Failed to resolve infraction');
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveAll = async () => {
    const unresolvedCount = infractions.filter(inf => !inf.resolved).length;
    if (unresolvedCount === 0) {
      alert('No unresolved infractions to resolve');
      return;
    }
    
    if (!confirm(`Resolve all ${unresolvedCount} unresolved infractions for ${student.fullName}?`)) return;
    
    try {
      const unresolvedInfractions = infractions.filter(inf => !inf.resolved);
      await Promise.all(
        unresolvedInfractions.map(inf =>
          client.api.fetch(`/api/infractions/${inf.id}/resolve`, {
            method: 'PATCH'
          })
        )
      );
      alert('All infractions resolved successfully');
      loadStudentProfile();
      onRefresh();
    } catch (err) {
      alert('Failed to resolve all infractions');
    }
  };

  const getStatus = (points: number) => {
    if (points >= 10) return 'DISCIPLINARY HOLD';
    if (points >= 7) return 'HIGH ALERT';
    if (points >= 4) return 'WARNING';
    return 'GOOD STANDING';
  };
  
  const getStatusColor = (points: number) => {
    if (points >= 10) return 'bg-purple-100 text-purple-700';
    if (points >= 7) return 'bg-red-100 text-red-700';
    if (points >= 4) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{student.fullName}</h2>
              <p className="text-slate-500">{student.email} • {student.section}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg font-bold ${getStatusColor(totalPoints)}`}>
              {getStatus(totalPoints)}
            </div>
            <div className="text-lg font-semibold text-slate-700">
              Current Points: {totalPoints}
            </div>
            <button
              onClick={handleResolveAll}
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              Resolve All Current Points
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Infraction History</h3>
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : infractions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No infractions found</div>
          ) : (
            <div className="space-y-3">
              {infractions.map((inf) => (
                <div key={inf.id} className={`border rounded-lg p-4 ${inf.resolved ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-slate-900">{inf.offense}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          inf.type === 'major' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {inf.type.toUpperCase()}
                        </span>
                        {inf.resolved ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Resolved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleResolveInfraction(inf.id)}
                            className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1 hover:bg-red-200 transition-colors"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Unresolved
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">
                        <div>Date: {new Date(inf.dateIssued * 1000).toLocaleString()}</div>
                        <div>Issued by: {inf.issuerName}</div>
                        <div className="font-semibold">
                          Points: {inf.resolved ? <span className="line-through text-slate-400">{inf.points}</span> : inf.points}
                        </div>
                        {inf.description && (
                          <div className="mt-2 text-slate-700">Remarks: {inf.description}</div>
                        )}
                        {(inf.studentResponse || inf.studentExplanation) && (
                          <div className="mt-2 bg-blue-50 p-2 rounded text-slate-700">
                            <div className="text-xs text-blue-600 font-medium">Student Response:</div>
                            {inf.studentResponse || inf.studentExplanation}
                          </div>
                        )}
                        {inf.resolved && inf.resolvedBy && (
                          <div className="mt-2 text-xs text-green-600">
                            Resolved by: {inf.resolverName} on {new Date(inf.resolvedAt * 1000).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    {!inf.resolved && (
                      <button
                        onClick={() => handleResolveInfraction(inf.id)}
                        disabled={resolvingId === inf.id}
                        className="ml-4 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        {resolvingId === inf.id ? 'Resolving...' : 'Resolve'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AdviserView() {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForInfraction, setSelectedForInfraction] = useState<any>(null);
  const [studentPoints, setStudentPoints] = useState<Record<string, number>>({});
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);

  useEffect(() => {
    loadRoster();
  }, []);

  const loadRoster = async () => {
    const res = await client.api.fetch('/api/adviser/roster');
    const data = await res.json();
    const students = data.students || [];
    // Sort alphabetically by full name
    students.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
    setRoster(students);

    // Load points for each student (excluding resolved infractions)
    const pointsPromises = students.map(async (s: any) => {
      const pointsRes = await client.api.fetch(`/api/students/${s.id}/points`);
      const pointsData = await pointsRes.json();
      return { id: s.id, points: pointsData.totalPoints || 0 };
    });

    const pointsResults = await Promise.all(pointsPromises);
    const pointsMap: Record<string, number> = {};
    pointsResults.forEach(p => {
      pointsMap[p.id] = p.points;
    });
    setStudentPoints(pointsMap);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <TeacherView role="adviser" preSelectedStudent={selectedForInfraction} />

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          Class Roster
        </h2>
        {loading ? <p className="text-slate-500">Loading roster...</p> : roster.length === 0 ? (
          <p className="text-slate-500">No students found in your section.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4 text-left">Name</th>
                  <th className="p-4 text-left hidden sm:table-cell">Email</th>
                  <th className="p-4 text-left">Total Points</th>
                  <th className="p-4 text-left hidden md:table-cell">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map(s => {
                  const points = studentPoints[s.id] || 0;
                  const getPointsColor = (p: number) => {
                    if (p >= 10) return 'text-purple-600 font-bold';
                    if (p >= 7) return 'text-red-600 font-bold';
                    if (p >= 4) return 'text-yellow-600 font-semibold';
                    return 'text-green-600';
                  };
                  
                  return (
                    <tr key={s.id}>
                      <td className="p-4 text-left">
                        <button
                          onClick={() => setSelectedStudentProfile(s)}
                          className="font-medium text-blue-600 hover:underline cursor-pointer text-left"
                        >
                          {s.fullName}
                        </button>
                      </td>
                      <td className="p-4 text-slate-500 text-left hidden sm:table-cell">{s.email}</td>
                      <td className={`p-4 text-left ${getPointsColor(points)}`}>{points}</td>
                      <td className="p-4 text-left hidden md:table-cell"><span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Active</span></td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => {
                            setSelectedForInfraction(s);
                            setTimeout(() => document.getElementById('infraction-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
                          }}
                          disabled={!!selectedForInfraction}
                          className="text-red-600 hover:text-red-800 font-medium text-xs flex items-center gap-1 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FileWarning className="w-3 h-3" />
                          Issue Infraction
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Invite Generation for Advisers */}
      <InviteGenerationCard userRole="adviser" />
      
      {/* Student Profile Modal */}
      {selectedStudentProfile && (
        <StudentProfileModal
          student={selectedStudentProfile}
          onClose={() => setSelectedStudentProfile(null)}
          onRefresh={loadRoster}
        />
      )}
    </div>
  );
}

function TeacherView({ role, preSelectedStudent }: { role: string, preSelectedStudent?: any }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [offense, setOffense] = useState('Tardy');
  const [type, setType] = useState('minor');
  const [points, setPoints] = useState(1);
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preSelectedStudent) {
      setSelectedStudent(preSelectedStudent);
    }
  }, [preSelectedStudent]);

  // Debounced search effect
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      setSelectedIndex(-1);
      return;
    }

    setSearching(true);
    setSelectedIndex(-1);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await client.api.fetch(`/api/students/search?q=${query}`);
        const data = await res.json();
        const students = data.students || [];
        // Sort alphabetically
        students.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
        setResults(students);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 150); // 150ms debounce for fast response

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || submitting) return;

    // Validation
    if (points < 0) {
      alert('Points cannot be negative');
      return;
    }

    if (type === 'minor') {
      if (points > 4) {
        alert('Minor infractions cannot exceed 4 points');
        return;
      }
    } else if (type === 'major') {
      if (points < 5 || points > 15) {
        alert('Major infractions must be between 5 and 15 points');
        return;
      }
    }

    setSubmitting(true);
    
    try {
      if (!navigator.onLine) {
        offlineManager.addToQueue('ISSUE_INFRACTION', {
          studentId: selectedStudent.id,
          type,
          offense,
          points,
          description: desc
        });
        alert('Infraction saved offline. It will be synced when you are back online.');
      } else {
        await client.api.fetch('/api/infractions', {
          method: 'POST',
          body: JSON.stringify({
            studentId: selectedStudent.id,
            type,
            offense,
            points,
            description: desc
          })
        });
        alert('Infraction Issued');
      }

      setSelectedStudent(null);
      setDesc('');
    } catch (err) {
      alert('Failed to issue infraction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Issue Infraction</h2>
            <p className="text-slate-500 text-sm">Search for a student to issue a new infraction.</p>
          </div>
          <button 
            onClick={() => searchInputRef.current?.focus()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
          >
            <Search className="w-4 h-4" />
            Find Student
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Student Search
          </h2>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (results.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                } else if (e.key === 'Enter' && selectedIndex >= 0) {
                  e.preventDefault();
                  setSelectedStudent(results[selectedIndex]);
                  setQuery('');
                  setResults([]);
                  setSelectedIndex(-1);
                }
              }}
              placeholder="Type student name..."
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {searching && query.length >= 2 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {results.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 z-10 max-h-60 overflow-y-auto">
                {results.map((s, idx) => {
                  const highlightText = (text: string, query: string) => {
                    if (!query.trim()) return text;
                    const parts = text.split(new RegExp(`(${query})`, 'gi'));
                    return parts.map((part, i) => 
                      part.toLowerCase() === query.toLowerCase() 
                        ? <mark key={i} className="bg-yellow-200 font-semibold">{part}</mark>
                        : part
                    );
                  };

                  return (
                    <div 
                      key={s.id} 
                      className={`flex items-center justify-between p-3 border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${
                        idx === selectedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => { setSelectedStudent(s); setQuery(''); setResults([]); setSelectedIndex(-1); }}
                    >
                      <div>
                        <div className="font-medium text-slate-900">{highlightText(s.fullName, query)}</div>
                        <div className="text-xs text-slate-500">{s.section || 'No Section'}</div>
                      </div>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation();
                          setSelectedStudent(s); 
                          setQuery(''); 
                          setResults([]); 
                          setSelectedIndex(-1);
                        }}
                        className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                      >
                        Select
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {selectedStudent && (
          <div id="infraction-form" className="bg-white rounded-xl shadow-sm p-6 border border-blue-200 ring-1 ring-blue-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedStudent.fullName}</h3>
                <p className="text-slate-500">{selectedStudent.section}</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedStudent(null);
                  setDesc('');
                  setPoints(1);
                  setType('minor');
                  setOffense('Tardy');
                }} 
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>

            <form onSubmit={handleIssue} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    value={type} 
                    onChange={(e) => { 
                      const newType = e.target.value;
                      setType(newType); 
                      if(newType === 'major') setPoints(5);
                      else setPoints(1);
                    }}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="minor">Minor Offense</option>
                    <option value="major">Major Offense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Points ({type === 'minor' ? 'Max 4' : '5-15'})
                  </label>
                  <input 
                    type="number" 
                    value={points} 
                    min={0}
                    max={type === 'minor' ? 4 : 15}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        setPoints(val);
                      } else if (e.target.value === '') {
                        setPoints(0);
                      }
                    }}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Offense</label>
                <select 
                  value={offense} 
                  onChange={(e) => setOffense(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  {type === 'minor' ? (
                    <>
                      <option>Tardy</option>
                      <option>Improper Uniform</option>
                      <option>Missing ID</option>
                      <option>Disruptive Behavior</option>
                    </>
                  ) : (
                    <>
                      <option>Vaping/Smoking</option>
                      <option>Bullying</option>
                      <option>Fighting</option>
                      <option>Theft</option>
                      <option>Sexual Misconduct</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (Optional)</label>
                <textarea 
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full p-2 border rounded-lg h-20"
                  placeholder="Additional details..."
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {submitting ? 'Issuing...' : 'ISSUE INFRACTION'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          {role === 'prefect' || role === 'developer' ? (
             <button className="w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium mb-2">
               Generate Invite Codes
             </button>
          ) : null}
          <div className="text-sm text-slate-400 text-center mt-4">
            More tools coming soon.
          </div>
        </div>
      </div>
    </div>
  );
}

// Invite Generation Card Component
function InviteGenerationCard({ userRole }: { userRole: 'developer' | 'prefect' | 'adviser' }) {
  const { appUser } = useStore();
  const [inviteRole, setInviteRole] = useState('student');
  const [section, setSection] = useState(SECTIONS[0]);
  const [maxUses, setMaxUses] = useState(10);
  const [code, setCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [myCodes, setMyCodes] = useState<any[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);

  // Set default section for adviser
  useEffect(() => {
    if (userRole === 'adviser' && appUser?.section) {
      setSection(appUser.section);
    }
  }, [userRole, appUser]);

  useEffect(() => {
    loadMyCodes();
  }, []);

  const loadMyCodes = async () => {
    setLoadingCodes(true);
    try {
      const res = await client.api.fetch('/api/invites/my-codes');
      const data = await res.json();
      setMyCodes(data.codes || []);
    } catch (err) {
      console.error('Failed to load codes', err);
    }
    setLoadingCodes(false);
  };

  const handleDeleteCode = async (codeId: number) => {
    if (!confirm('Are you sure you want to delete this invite code?')) return;
    
    try {
      await client.api.fetch(`/api/invites/${codeId}`, { method: 'DELETE' });
      loadMyCodes(); // Refresh list
    } catch (err) {
      alert('Failed to delete code');
    }
  };

  const handleGenerate = async () => {
    if (!inviteRole) {
      alert('Please select a role');
      return;
    }
    
    // Advisers can only generate student codes for their own section
    if (userRole === 'adviser' && inviteRole !== 'student') {
      alert('Advisers can only generate student invite codes');
      return;
    }

    if (generating) return;
    setGenerating(true);
    
    try {
      const res = await client.api.fetch('/api/invites/generate', {
        method: 'POST',
        body: JSON.stringify({
          role: inviteRole,
          section: (inviteRole === 'student' || inviteRole === 'adviser') ? section : null,
          maxUses
        })
      });
      const data = await res.json();
      setCode(data.code);
      loadMyCodes(); // Refresh list
    } catch (err) {
      alert('Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
      <h2 className="text-lg font-semibold mb-4">Generate Invite Code</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <select 
            value={inviteRole} 
            onChange={(e) => setInviteRole(e.target.value)}
            className="w-full p-2 border rounded-lg"
            disabled={userRole === 'adviser'}
          >
            <option value="student">Student</option>
            {userRole !== 'adviser' && (
              <>
                <option value="teacher">Teacher</option>
                <option value="adviser">Adviser</option>
                <option value="prefect">Prefect</option>
              </>
            )}
          </select>
        </div>

        {(inviteRole === 'student' || inviteRole === 'adviser') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full p-2 border rounded-lg"
              disabled={userRole === 'adviser'}
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses</label>
          <input 
            type="number" 
            value={maxUses} 
            onChange={(e) => setMaxUses(parseInt(e.target.value))}
            className="w-full p-2 border rounded-lg"
          />
        </div>

        <button 
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-slate-300"
        >
          {generating ? 'Generating...' : 'Generate Code'}
        </button>

        {code && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-600 font-medium mb-1">Generated Code:</div>
            <div className="font-mono text-lg font-bold text-green-900 bg-white p-2 rounded border border-green-200">
              {code}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Your Generated Codes</h3>
        {loadingCodes ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : myCodes.length === 0 ? (
          <p className="text-slate-400 text-sm">No codes generated yet</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {myCodes.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold text-slate-900 truncate">{c.code}</div>
                  <div className="text-xs text-slate-500">
                    {c.role} • {c.usedCount}/{c.maxUses} uses
                    {c.section && ` • ${c.section}`}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteCode(c.id)}
                  className="text-red-500 hover:text-red-700 text-xs ml-2"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeveloperView() {
  const { switchRole } = useStore();
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await client.api.fetch('/api/system/stats');
      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
    setLoadingStats(false);
  };

  return (
    <div className="space-y-6">
      {/* System Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-lg font-semibold mb-4">System Statistics</h2>
        {loadingStats ? (
          <p className="text-slate-500">Loading statistics...</p>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-3xl font-bold text-blue-700">{stats.students}</div>
              <div className="text-sm text-blue-600 mt-1">Students</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-3xl font-bold text-green-700">{stats.teachers}</div>
              <div className="text-sm text-green-600 mt-1">Teachers</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-3xl font-bold text-purple-700">{stats.advisers}</div>
              <div className="text-sm text-purple-600 mt-1">Advisers</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-3xl font-bold text-orange-700">{stats.prefects}</div>
              <div className="text-sm text-orange-600 mt-1">Prefects</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-3xl font-bold text-slate-700">{stats.total}</div>
              <div className="text-sm text-slate-600 mt-1">Total Users</div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500">Failed to load statistics</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-lg font-semibold mb-4">Developer Tools</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <InviteGenerationCard userRole="developer" />

          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-medium mb-2">Role Switcher (Preview Mode)</h3>
            <div className="flex gap-2 flex-wrap">
              {['student', 'teacher', 'adviser', 'prefect'].map(r => (
                <button 
                  key={r} 
                  onClick={() => switchRole(r)} 
                  className="bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 px-3 py-2 rounded text-sm capitalize transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <PrefectTeacherView role="developer" />
    </div>
  );
}

// Prefect and Teacher view with centralized infraction records
function PrefectTeacherView({ role, preSelectedStudent }: { role: string, preSelectedStudent?: any }) {
  const [activeTab, setActiveTab] = useState<'issue' | 'records' | 'invites'>(role === 'teacher' ? 'issue' : 'records');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [offense, setOffense] = useState('Tardy');
  const [type, setType] = useState('minor');
  const [points, setPoints] = useState(1);
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Infraction Records state
  const [allInfractions, setAllInfractions] = useState<any[]>([]);
  const [filteredInfractions, setFilteredInfractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState('all');
  const [selectedInfraction, setSelectedInfraction] = useState<any>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [selectedRoleStats, setSelectedRoleStats] = useState<string | null>(null);

  // Users/Stats state (for prefects and developers)
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (preSelectedStudent) {
      setSelectedStudent(preSelectedStudent);
      setActiveTab('issue');
    }
  }, [preSelectedStudent]);

  useEffect(() => {
    loadAllInfractions();
    if (['prefect', 'developer'].includes(role)) {
      loadStats();
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, typeFilter, resolvedFilter, allInfractions]);

  const loadStats = async () => {
    try {
      const res = await client.api.fetch('/api/system/stats');
      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const loadAllInfractions = async () => {
    setLoading(true);
    try {
      const res = await client.api.fetch('/api/infractions?limit=500');
      const data = await res.json();
      setAllInfractions(data.infractions || []);
      offlineManager.cacheData('all_infractions', data.infractions);
    } catch (e) {
      const cached = offlineManager.getCachedData('all_infractions');
      if (cached) setAllInfractions(cached);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...allInfractions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inf => 
        inf.studentName.toLowerCase().includes(query) ||
        inf.studentSection.toLowerCase().includes(query) ||
        inf.offense.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(inf => inf.type === typeFilter);
    }

    if (resolvedFilter === 'resolved') {
      filtered = filtered.filter(inf => !!inf.resolved);
    } else if (resolvedFilter === 'unresolved') {
      filtered = filtered.filter(inf => !inf.resolved);
    }

    setFilteredInfractions(filtered);
  };

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    const res = await client.api.fetch(`/api/students/search?q=${val}`);
    const data = await res.json();
    setResults(data.students || []);
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSubmitting(true);
    
    if (!navigator.onLine) {
      offlineManager.addToQueue('ISSUE_INFRACTION', {
        studentId: selectedStudent.id,
        type,
        offense,
        points: type === 'major' ? 10 : points,
        description: desc
      });
      alert('Infraction saved offline. It will be synced when you are back online.');
    } else {
      try {
        await client.api.fetch('/api/infractions', {
          method: 'POST',
          body: JSON.stringify({
            studentId: selectedStudent.id,
            type,
            offense,
            points: type === 'major' ? 10 : points,
            description: desc
          })
        });
        alert('Infraction Issued');
        loadAllInfractions(); // Refresh records
      } catch (e) {
        alert('Failed to issue infraction');
      }
    }

    setSubmitting(false);
    setSelectedStudent(null);
    setDesc('');
  };

  const handleResolveInfraction = async (infractionId: number) => {
    if (!confirm('Are you sure you want to resolve this infraction?')) return;
    
    if (resolvingId) return;
    setResolvingId(infractionId);
    
    try {
      await client.api.fetch(`/api/infractions/${infractionId}/resolve`, {
        method: 'PATCH'
      });
      alert('Infraction resolved successfully');
      await loadAllInfractions();
      
      // Update the selected infraction to reflect resolved state if modal is open
      if (selectedInfraction && selectedInfraction.id === infractionId) {
        setSelectedInfraction({ ...selectedInfraction, resolved: true });
      }
    } catch (err) {
      alert('Failed to resolve infraction');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Statistics (for prefects/developers) */}
      {['prefect', 'developer'].includes(role) && stats && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <h3 className="text-sm font-semibold mb-3 text-slate-600">System Overview</h3>
          <div className="grid grid-cols-4 gap-2">
            <button 
              onClick={() => setSelectedRoleStats('student')}
              className="bg-blue-50 rounded p-2 border border-blue-200 text-center hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <div className="text-lg font-bold text-blue-700">{stats.students}</div>
              <div className="text-xs text-blue-600">Students</div>
            </button>
            <button 
              onClick={() => setSelectedRoleStats('teacher')}
              className="bg-green-50 rounded p-2 border border-green-200 text-center hover:bg-green-100 transition-colors cursor-pointer"
            >
              <div className="text-lg font-bold text-green-700">{stats.teachers}</div>
              <div className="text-xs text-green-600">Teachers</div>
            </button>
            <button 
              onClick={() => setSelectedRoleStats('adviser')}
              className="bg-purple-50 rounded p-2 border border-purple-200 text-center hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <div className="text-lg font-bold text-purple-700">{stats.advisers}</div>
              <div className="text-xs text-purple-600">Advisers</div>
            </button>
            <button 
              onClick={() => setSelectedRoleStats('prefect')}
              className="bg-orange-50 rounded p-2 border border-orange-200 text-center hover:bg-orange-100 transition-colors cursor-pointer"
            >
              <div className="text-lg font-bold text-orange-700">{stats.prefects}</div>
              <div className="text-xs text-orange-600">Prefects</div>
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {role !== 'teacher' && (
            <button
              onClick={() => setActiveTab('records')}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
                activeTab === 'records'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              📋 Infraction Records
            </button>
          )}
          <button
            onClick={() => setActiveTab('issue')}
            className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
              activeTab === 'issue'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            ⚠️ Issue Infraction
          </button>
          {(role === 'prefect' || role === 'developer') && (
            <button
              onClick={() => setActiveTab('invites')}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
                activeTab === 'invites'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              🎟️ Generate Invites
            </button>
          )}
        </div>
      </div>

      {/* Infraction Records Tab */}
      {activeTab === 'records' && role !== 'teacher' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name, section, or offense..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                </select>
                <select
                  value={resolvedFilter}
                  onChange={(e) => setResolvedFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="unresolved">Unresolved</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button
                  onClick={loadAllInfractions}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Showing {filteredInfractions.length} of {allInfractions.length} records
              {resolvedFilter !== 'all' && ` (${resolvedFilter})`}
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading records...</div>
            ) : filteredInfractions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                {searchQuery || typeFilter !== 'all' || resolvedFilter !== 'all' ? 'No matching records found' : 'No infractions recorded yet'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Student</th>
                      <th className="p-3 text-left">Section</th>
                      <th className="p-3 text-left">Offense</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Points</th>
                      <th className="p-3 text-left">Issuer</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInfractions.map((inf) => (
                      <tr key={inf.id} className={`hover:bg-slate-50 ${inf.resolved ? 'opacity-50' : ''}`}>
                        <td className="p-3 text-slate-700">
                          {new Date(inf.dateIssued * 1000).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => setSelectedStudentProfile({ id: inf.studentId, fullName: inf.studentName, email: inf.studentEmail, section: inf.studentSection })}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {inf.studentName}
                          </button>
                        </td>
                        <td className="p-3 text-slate-600">{inf.studentSection}</td>
                        <td className="p-3 text-slate-900">{inf.offense}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            inf.type === 'major' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {inf.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-700">
                          {inf.resolved ? (
                            <span className="line-through text-slate-400">{inf.points}</span>
                          ) : (
                            <span>{inf.points}</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 text-xs">{inf.issuerName}</td>
                        <td className="p-3">
                          {inf.resolved ? (
                            <span className="text-green-600 text-xs flex items-center gap-1 font-bold">
                              <CheckCircle className="w-3 h-3" />
                              Resolved
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveInfraction(inf.id);
                              }}
                              className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs flex items-center gap-1 font-bold hover:bg-red-200 transition-colors"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Unresolved
                            </button>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInfraction(inf);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Issue Infraction Tab */}
      {activeTab === 'issue' && <TeacherView role={role} preSelectedStudent={preSelectedStudent} />}

      {/* Invite Generation Tab */}
      {activeTab === 'invites' && (role === 'prefect' || role === 'developer') && (
        <InviteGenerationCard userRole={role as 'prefect' | 'developer'} />
      )}

      {/* Infraction Detail Modal */}
      {selectedInfraction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-900">Infraction Details</h3>
              <button onClick={() => setSelectedInfraction(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase">Student</div>
                  <button
                    onClick={() => {
                      setSelectedStudentProfile({ 
                        id: selectedInfraction.studentId, 
                        fullName: selectedInfraction.studentName, 
                        email: selectedInfraction.studentEmail, 
                        section: selectedInfraction.studentSection 
                      });
                    }}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {selectedInfraction.studentName}
                  </button>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Section</div>
                  <div className="font-semibold text-slate-900">{selectedInfraction.studentSection}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Date Issued</div>
                  <div className="text-slate-700">
                    {new Date(selectedInfraction.dateIssued * 1000).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Issuer</div>
                  <div className="text-slate-700">{selectedInfraction.issuerName}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-xs text-slate-500 uppercase mb-1">Offense</div>
                <div className="text-lg font-bold text-slate-900">{selectedInfraction.offense}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase">Type</div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    selectedInfraction.type === 'major' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedInfraction.type.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Points</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {selectedInfraction.resolved ? (
                      <span className="line-through text-slate-400">{selectedInfraction.points}</span>
                    ) : (
                      <span>{selectedInfraction.points}</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedInfraction.description && (
                <div>
                  <div className="text-xs text-slate-500 uppercase mb-1">Remarks</div>
                  <div className="text-slate-700 bg-slate-50 p-3 rounded-lg">
                    {selectedInfraction.description}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-2">
                  <MessageCircle className="w-3 h-3" />
                  Student Response
                  {(selectedInfraction.responseSubmittedAt || selectedInfraction.explanationSubmittedAt) && (
                    <span className="text-xs text-slate-400">
                      • {new Date((selectedInfraction.responseSubmittedAt || selectedInfraction.explanationSubmittedAt) * 1000).toLocaleString()}
                    </span>
                  )}
                </div>
                {(selectedInfraction.studentResponse || selectedInfraction.studentExplanation) ? (
                  <div className="text-slate-900 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    {selectedInfraction.studentResponse || selectedInfraction.studentExplanation}
                  </div>
                ) : (
                  <div className="text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-200">
                    No explanation submitted yet.
                  </div>
                )}
              </div>

              {selectedInfraction.resolved && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-sm font-medium text-green-700 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Resolved
                  </div>
                  {selectedInfraction.resolvedBy && (
                    <div className="text-xs text-green-600 mt-1">
                      By: {selectedInfraction.resolverName} on {new Date(selectedInfraction.resolvedAt * 1000).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {!selectedInfraction.resolved ? (
                <button
                  onClick={() => handleResolveInfraction(selectedInfraction.id)}
                  disabled={resolvingId === selectedInfraction.id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {resolvingId === selectedInfraction.id ? 'Resolving...' : 'Resolve Infraction'}
                </button>
              ) : (
                <div className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium flex items-center justify-center gap-2 cursor-not-allowed">
                  <CheckCircle className="w-4 h-4" />
                  Already Resolved
                </div>
              )}
              <button
                onClick={() => setSelectedInfraction(null)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Profile Modal */}
      {selectedStudentProfile && (
        <StudentProfileModal
          student={selectedStudentProfile}
          onClose={() => setSelectedStudentProfile(null)}
          onRefresh={loadAllInfractions}
        />
      )}

      {/* User List Modal */}
      {selectedRoleStats && (
        <UserListModal
          role={selectedRoleStats}
          onClose={() => setSelectedRoleStats(null)}
        />
      )}
    </div>
  );
}

function UserListModal({ role, onClose }: { role: string, onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, [role]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await client.api.fetch(`/api/users/search?role=${role}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (u.section && u.section.toLowerCase().includes(search.toLowerCase()))
  );

  const getRoleColor = (r: string) => {
    switch(r) {
      case 'student': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'adviser': return 'bg-purple-100 text-purple-800';
      case 'prefect': return 'bg-orange-100 text-orange-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getRoleTitle = (r: string) => {
    switch(r) {
      case 'student': return 'Students';
      case 'teacher': return 'Teachers';
      case 'adviser': return 'Advisers';
      case 'prefect': return 'Prefects';
      default: return 'Users';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-500" />
            {getRoleTitle(role)} Directory
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${getRoleTitle(role).toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No users found.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                      {user.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{user.fullName}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                    {user.section && (
                      <span className="text-xs text-slate-500">
                        Section: {user.section}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
