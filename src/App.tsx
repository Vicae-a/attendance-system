import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Calendar, BarChart3, Star, Heart, Crown, Plus, X, User, Phone, Mail,
  MapPin, AlertCircle, Upload, Loader, Search, Filter, TrendingUp, Award,
  Camera, Edit3, Trash2, Download, RefreshCw, Clock, CheckCircle2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Import your actual Firebase services
import { childrenService, attendanceService, addSampleData } from './services/firebaseServices';
import logo from './clipart3307284.png'
const EnhancedChildrensChurchAttendance = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedClass, setSelectedClass] = useState(null);
  const [children, setChildren] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showEditChild, setShowEditChild] = useState(false);
  const [showChildDetails, setShowChildDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);

  // Load data on component mount and when date changes
  useEffect(() => {
    loadData();
  }, [currentDate]);

  // Auto-clear messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);


  useEffect(() => {
    let unsubscribe;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [childrenData, allAttendanceData] = await Promise.all([
          childrenService.getAll(),
          attendanceService.getAll()
        ]);

        setChildren(childrenData);
        setAllAttendanceRecords(allAttendanceData);

        // Set up real-time listener for current date
        unsubscribe = attendanceService.setupDateListener(
          currentDate,
          (records) => setAttendanceRecords(records)
        );
      } catch (err) {
        setError('Failed to load data. Please try again.');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentDate]);


  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [childrenData, attendanceData, allAttendanceData] = await Promise.all([
        childrenService.getAll(),
        // Modified to use new structure
        attendanceService.getByDate(currentDate),
        attendanceService.getAll()
      ]);

      // Transform attendance data to match expected format
      const formattedAttendance = attendanceData.map(record => ({
        id: record.childId, // Using childId as ID for consistency
        childId: record.childId,
        date: currentDate,
        present: record.present,
        markedAt: record.markedAt?.toDate() || new Date()
      }));

      setChildren(childrenData);
      setAttendanceRecords(formattedAttendance);
      setAllAttendanceRecords(allAttendanceData);
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAddSampleData = async () => {
    if (window.confirm('This will add sample children to your database. Continue?')) {
      setLoading(true);
      try {
        await addSampleData();
        await loadData(); // Refresh data
        setSuccess('Sample data added successfully!');
      } catch (error) {
        setError('Failed to add sample data: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const markAttendance = async (childId, isPresent) => {
    try {
      // Get the actual Firestore result
      const result = await attendanceService.markAttendance(childId, currentDate, isPresent);

      // Update state based on Firestore response
      setAttendanceRecords(prev => {
        const filtered = prev.filter(r => r.childId !== childId);
        return isPresent && result ? [...filtered, result] : filtered;
      });

      // Similar update for allAttendanceRecords
      setAllAttendanceRecords(prev => {
        const filtered = prev.filter(r => !(r.childId === childId && r.date === currentDate));
        return isPresent && result ? [...filtered, result] : filtered;
      });

      setSuccess(isPresent ? 'Marked as present!' : 'Marked as absent!');
    } catch (err) {
      setError('Failed to mark attendance. Please try again.');
      console.error('Error marking attendance:', err);
    }
  };
  const loadChildDetails = async (child) => {
    setDetailsLoading(true);
    setError(null);
    try {
      const history = await attendanceService.getByChild(child.id);
      setSelectedChild({ ...child, attendanceHistory: history });
      setShowChildDetails(true);
    } catch (err) {
      setError('Failed to load child details. Please try again.');
      console.error('Error loading child details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getClassFromAge = (age) => {
    if (age <= 5) return 'Candle Lighters';
    if (age <= 7) return 'Cupbearers';
    return 'Cadets';
  };

  const getChildClass = (child) => {
    // If class is explicitly set, use that
    if (child.class && child.class.trim() !== '') {
      return child.class;
    }

    // Otherwise calculate from age
    if (child.birthDate) {
      return getClassFromAge(calculateAge(child.birthDate));
    }

    // Default fallback
    return 'Cadets';
  };

  const classes = [
    {
      name: 'Candle Lighters',
      ages: '5 & Below',
      icon: Star,
      color: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      shadowColor: 'shadow-yellow-200'
    },
    {
      name: 'Cupbearers',
      ages: '6-7 Years',
      icon: Heart,
      color: 'bg-gradient-to-br from-red-400 via-pink-500 to-rose-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
      shadowColor: 'shadow-red-200'
    },
    {
      name: 'Cadets',
      ages: '8+ Years',
      icon: Crown,
      color: 'bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200',
      shadowColor: 'shadow-blue-200'
    }
  ];

  const isChildPresent = (childId) => attendanceRecords.some(record => record.date === currentDate && record.childId === childId && record.present);

  // Memoized filtered children for performance
  const filteredChildren = useMemo(() => {
    return children.filter(child => {
      const matchesSearch = child.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = attendanceFilter === 'all' ||
        (attendanceFilter === 'present' && isChildPresent(child.id)) ||
        (attendanceFilter === 'absent' && !isChildPresent(child.id));
      return matchesSearch && matchesFilter;
    });
  }, [children, searchTerm, attendanceFilter, attendanceRecords, currentDate]);

  const AnimatedCard = ({ children: cardChildren, className = "", onClick, ...props }) => (
    <div
      className={`transform transition-all duration-300 hover:scale-105 hover:shadow-2xl ${className}`}
      onClick={onClick}
      {...props}
    >
      {cardChildren}
    </div>
  );

  const ClassCard = ({ classInfo }) => {
    const IconComponent = classInfo.icon;
    const classChildren = children.filter(child => getChildClass(child) === classInfo.name);
    const present = classChildren.filter(child => isChildPresent(child.id)).length;
    const total = classChildren.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return (
      <AnimatedCard
        className={`group relative overflow-hidden ${classInfo.bgColor} ${classInfo.borderColor} border-2 rounded-xl md:rounded-2xl lg:rounded-3xl p-4 md:p-6 lg:p-8 cursor-pointer shadow-lg md:shadow-xl ${classInfo.shadowColor} backdrop-blur-sm active:scale-95 md:hover:scale-105`}
        onClick={() => {
          setSelectedClass(classInfo.name);
          setCurrentView('attendance');
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative flex flex-col items-center text-center">
          <div className={`${classInfo.color} p-3 md:p-4 lg:p-6 rounded-xl md:rounded-2xl mb-3 md:mb-4 lg:mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
            <IconComponent className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white drop-shadow-lg" />
          </div>
          <h3 className={`text-lg md:text-xl lg:text-2xl font-bold ${classInfo.textColor} mb-1 md:mb-2 lg:mb-3 group-hover:scale-105 transition-transform duration-300`}>
            {classInfo.name}
          </h3>
          <p className="text-gray-600 text-xs md:text-sm lg:text-base mb-3 md:mb-4 lg:mb-6 font-medium">{classInfo.ages}</p>
          <div className="w-full">
            <div className="flex justify-between items-center mb-2 md:mb-3 lg:mb-4">
              <span className="text-xl md:text-2xl lg:text-3xl font-black text-gray-800">{present}/{total}</span>
              <span className="text-sm md:text-base lg:text-lg font-bold text-gray-600 bg-white/50 px-2 md:px-3 py-1 rounded-full">
                {percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 md:h-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 md:h-3 rounded-full transition-all duration-1000 shadow-sm"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </AnimatedCard>
    );
  };

  const ChildCard = ({ child, showAttendance = false, onAttendanceToggle }) => {
    const age = child.birthDate ? calculateAge(child.birthDate) : null;
    const className = getChildClass(child);
    const classInfo = classes.find(c => c.name === className);
    const isPresent = isChildPresent(child.id);

    return (
      <AnimatedCard
        className="bg-white border-2 border-gray-100 rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 cursor-pointer shadow-md md:shadow-lg hover:border-blue-200 active:scale-[0.98] md:hover:scale-[1.02] transition-all duration-200"
        onClick={() => loadChildDetails(child)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              {child.photoUrl ? (
                <img
                  src={child.photoUrl}
                  alt={child.name}
                  className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl object-cover border-2 border-gray-200"
                />
              ) : (
                <div className={`w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 ${classInfo?.color} rounded-xl md:rounded-2xl flex items-center justify-center text-white text-sm md:text-lg lg:text-2xl font-bold shadow-lg`}>
                  {child.name.charAt(0)}
                </div>
              )}
              {showAttendance && isPresent && (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 md:p-1">
                  <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm md:text-lg lg:text-xl font-bold text-gray-800 mb-0.5 md:mb-1 truncate">{child.name}</h3>
              <p className="text-gray-500 text-xs md:text-sm">Age {age} • {className}</p>
              {/* {child.parentName && (
                <p className="text-gray-400 text-xs mt-0.5 md:mt-1 truncate hidden md:block">Parent: {child.parentName}</p>
              )} */}
            </div>
          </div>

          {showAttendance && (
            <button
              className={`... ${markingAttendance ? 'opacity-50' : ''}`}
              onClick={e => {
                e.stopPropagation();
                onAttendanceToggle(child.id, !isPresent);
              }}
              disabled={markingAttendance}
            >
              {markingAttendance ? (
                <Loader className="w-4 h-4 animate-spin mx-auto" />
              ) : isPresent ? (
                'Present ✓'
              ) : (
                'Mark Present'
              )}
            </button>
          )}
        </div>
      </AnimatedCard>
    );
  };

  const AttendanceView = () => {
    const classChildren = children
      .filter(child => getChildClass(child) === selectedClass)
      .filter(child => child.name.toLowerCase().includes(classSearchTerm.toLowerCase()));
    const classInfo = classes.find(cls => cls.name === selectedClass);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-3xl shadow-2xl p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 lg:mb-8">
            <button
              className="flex items-center text-blue-600 hover:text-blue-800 font-semibold transition-all duration-200 hover:scale-105"
              onClick={() => setCurrentView('dashboard')}
            >
              ← Back to Dashboard
            </button>
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={currentDate}
                onChange={e => setCurrentDate(e.target.value)}
                className="border-2 border-gray-200 rounded-xl px-3 lg:px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 lg:mb-8">
            <div className={`${classInfo?.color} p-3 lg:p-4 rounded-2xl shadow-lg flex-shrink-0`}>
              {classInfo?.icon && <classInfo.icon className="w-6 h-6 lg:w-8 lg:h-8 text-white" />}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">{selectedClass} Attendance</h2>
              <p className="text-gray-600 text-sm lg:text-base">Mark attendance for {new Date(currentDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 lg:w-5 lg:h-5" />
              <input
                type="text"
                value={classSearchTerm}
                onChange={e => setClassSearchTerm(e.target.value)}
                placeholder="Search for a child in this class..."
                className="w-full pl-10 lg:pl-12 pr-4 py-2 lg:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
              />
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 lg:py-12">
              <Loader className="w-6 h-6 lg:w-8 lg:h-8 animate-spin text-blue-600" />
              <span className="ml-2 lg:ml-3 text-gray-600 text-base lg:text-lg">Loading...</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {classChildren.map(child => (
              <ChildCard
                key={child.id}
                child={child}
                showAttendance={true}
                onAttendanceToggle={markAttendance}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const AddChildForm = () => {
    const [formState, setFormState] = useState({
      name: '',
      birthDate: '',
      address: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      photo: null
    });


    const [formLoading, setFormLoading] = useState(false);
    useEffect(() => {
      if (formState.birthDate && !formState.className) {
        const age = calculateAge(formState.birthDate);
        const calculatedClass = getClassFromAge(age);
        setFormState(prev => ({ ...prev, className: calculatedClass }));
      }
    }, [formState.birthDate]);


    const handleInputChange = (field, value) => {
      setFormState(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
      if (!formState.name.trim() || !formState.birthDate) {
        setError('Name and birth date are required');
        return;
      }

      setFormLoading(true);
      try {
        let photoUrl = null;
        if (formState.photo) {
          photoUrl = await childrenService.uploadPhoto(null, formState.photo);
        }

        const childId = await childrenService.add({
          ...formState,
          photoUrl
        });

        const newChild = {
          id: childId,
          ...formState,
          photoUrl
        };

        setChildren(prev => [...prev, newChild]);
        setFormState({
          name: '',
          birthDate: '',
          address: '',
          parentName: '',
          parentPhone: '',
          parentEmail: '',
          photo: null
        });
        setShowAddChild(false);
        setSuccess('Child added successfully!');
        setError(null);
      } catch (err) {
        setError('Failed to add child. Please try again.');
        console.error('Error adding child:', err);
      } finally {
        setFormLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white p-4 lg:p-6 border-b border-gray-100 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-800">Add New Child</h3>
              <button
                onClick={() => setShowAddChild(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
          </div>

          <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Child's Name *</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="Enter child's name"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Birth Date *</label>
                <input
                  type="date"
                  value={formState.birthDate}
                  onChange={e => handleInputChange('birthDate', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={formState.address}
                onChange={e => handleInputChange('address', e.target.value)}
                placeholder="Enter home address"
                className="w-full border-2 border-gray-200 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Name</label>
                <input
                  type="text"
                  value={formState.parentName}
                  onChange={e => handleInputChange('parentName', e.target.value)}
                  placeholder="Enter parent's name"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Phone</label>
                <input
                  type="tel"
                  value={formState.parentPhone}
                  onChange={e => handleInputChange('parentPhone', e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Email</label>
              <input
                type="email"
                value={formState.parentEmail}
                onChange={e => handleInputChange('parentEmail', e.target.value)}
                placeholder="Enter email address"
                className="w-full border-2 border-gray-200 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Photo (Optional)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleInputChange('photo', e.target.files[0])}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex items-center gap-3 px-3 lg:px-4 py-2 lg:py-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-all duration-200 text-sm lg:text-base"
                >
                  <Upload className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                  <span className="text-gray-600">
                    {formState.photo ? formState.photo.name : 'Choose photo'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-4 lg:mx-6 mb-4 p-3 lg:p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" />
                <p className="text-red-700 font-medium text-sm lg:text-base">{error}</p>
              </div>
            </div>
          )}

          <div className="sticky bottom-0 bg-white p-4 lg:p-6 border-t border-gray-100 rounded-b-3xl">
            <div className="flex gap-3 lg:gap-4">
              <button
                onClick={() => setShowAddChild(false)}
                className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2 lg:py-3 px-4 lg:px-6 rounded-xl hover:bg-gray-200 transition-all duration-200 text-sm lg:text-base"
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={formLoading}
                className="flex-1 bg-blue-600 text-white font-semibold py-2 lg:py-3 px-4 lg:px-6 rounded-xl hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm lg:text-base"
              >
                {formLoading && <Loader className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />}
                {formLoading ? 'Adding...' : 'Add Child'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ChildDetailsModal = ({ child, onClose }) => {
    if (!child) return null;

    const history = child.attendanceHistory || [];
    const presentCount = history.filter(r => r.present).length;
    const percentage = history.length > 0 ? Math.round((presentCount / history.length) * 100) : 0;
    const age = calculateAge(child.birthDate);
    const className = getChildClass(child);

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
        <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-4xl h-[90vh] md:max-h-[90vh] overflow-y-auto">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white p-4 md:p-6 border-b border-gray-100 rounded-t-3xl">
            {/* Mobile drag indicator */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 md:hidden"></div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                {child.photoUrl ? (
                  <img
                    src={child.photoUrl}
                    alt={child.name}
                    className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl object-cover border-2 border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white text-lg md:text-2xl font-bold flex-shrink-0">
                    {child.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 truncate">{child.name}</h3>
                  <p className="text-gray-600 text-sm md:text-base">Age {age} • {className}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 flex-shrink-0"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6 space-y-6">
            {/* Child Information Grid - Responsive */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs md:text-sm text-gray-500 block">Full Name</span>
                    <p className="font-semibold text-gray-800 text-sm md:text-base break-words">{child.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs md:text-sm text-gray-500 block">Age & Birth Date</span>
                    <p className="font-semibold text-gray-800 text-sm md:text-base">{age} years old</p>
                    <p className="text-gray-600 text-xs md:text-sm">({child.birthDate})</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Crown className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs md:text-sm text-gray-500 block">Class</span>
                    <p className="font-semibold text-gray-800 text-sm md:text-base">{className}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs md:text-sm text-gray-500 block">Address</span>
                    <p className="font-semibold text-gray-800 text-sm md:text-base break-words">{child.address || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs md:text-sm text-gray-500 block">Parent</span>
                    <p className="font-semibold text-gray-800 text-sm md:text-base break-words">{child.parentName || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs md:text-sm text-gray-500 block">Phone</span>
                    <p className="font-semibold text-gray-800 text-sm md:text-base break-all">{child.parentPhone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Summary - Mobile Optimized */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl md:rounded-2xl p-4 md:p-6">
              <h4 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Attendance Summary</h4>
              <div className="grid grid-cols-3 gap-3 md:gap-6">
                <div className="text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-green-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-5 h-5 md:w-8 md:h-8 text-white" />
                  </div>
                  <p className="text-xl md:text-3xl font-bold text-green-600">{presentCount}</p>
                  <p className="text-xs md:text-sm text-gray-600">Attended</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-blue-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <BarChart3 className="w-5 h-5 md:w-8 md:h-8 text-white" />
                  </div>
                  <p className="text-xl md:text-3xl font-bold text-blue-600">{percentage}%</p>
                  <p className="text-xs md:text-sm text-gray-600">Rate</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-purple-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Calendar className="w-5 h-5 md:w-8 md:h-8 text-white" />
                  </div>
                  <p className="text-xl md:text-3xl font-bold text-purple-600">{history.length}</p>
                  <p className="text-xs md:text-sm text-gray-600">Records</p>
                </div>
              </div>
            </div>

            {/* Attendance History - Mobile Optimized */}
            <div>
              <h4 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4">Recent Attendance</h4>
              <div className="max-h-60 md:max-h-64 overflow-y-auto">
                {history.length > 0 ? (
                  <div className="space-y-2">
                    {history.slice(0, 15).map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg md:rounded-xl hover:bg-gray-100 transition-colors duration-200">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${record.present ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="font-medium text-gray-700 text-sm md:text-base">{new Date(record.date).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${record.present
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {record.present ? 'Present' : 'Absent'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm md:text-base">No records found</p>
                    <p className="text-gray-400 text-xs md:text-sm">Start taking attendance to see records</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AttendanceGraph = ({ attendanceRecords, children }) => {
    const dateGroups = attendanceRecords.reduce((acc, record) => {
      if (!acc[record.date]) {
        acc[record.date] = { date: record.date, present: 0, total: children.length };
      }
      if (record.present) {
        acc[record.date].present++;
      }
      return acc;
    }, {});

    const data = Object.values(dateGroups)
      .map(group => ({
        ...group,
        percentage: group.total > 0 ? Math.round((group.present / group.total) * 100) : 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10); // Show last 10 services

    if (data.length === 0) {
      return (
        <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-lg">
          <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-4">Attendance Trends</h3>
          <div className="text-center py-8 lg:py-12">
            <BarChart3 className="w-12 h-12 lg:w-16 lg:h-16 text-gray-300 mx-auto mb-3 lg:mb-4" />
            <p className="text-gray-500 text-base lg:text-lg">No attendance data available</p>
            <p className="text-gray-400 text-sm">Start taking attendance to see trends</p>
          </div>
        </div>
      );
    }

    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <p className="font-bold text-gray-800">
              {new Date(label).toLocaleDateString()}
            </p>
            <p className="text-blue-600">
              <span className="font-semibold">{data.percentage}%</span> attendance
            </p>
            <p className="text-gray-600 text-sm">
              {data.present} of {data.total} children present
            </p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-lg">
        <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-4">Attendance Trends</h3>
        <div className="h-64 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
                stroke="#666"
                fontSize={12}
              />
              <Tooltip
                content={<CustomTooltip />}
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-2 lg:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8 lg:mb-12">
          <div className="flex flex-col items-center gap-3 md:gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shadow-2xl">
              <img src={logo} alt="" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-gray-800 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                Children Church
              </h1>
              <p className="text-sm md:text-lg lg:text-xl text-gray-600 font-medium mt-1">Attendance Management</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-red-50 border-2 border-red-200 rounded-2xl shadow-lg animate-pulse">
            <div className="flex items-center gap-2 lg:gap-3">
              <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6 text-red-600 flex-shrink-0" />
              <p className="text-red-700 font-semibold text-sm lg:text-base">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-green-50 border-2 border-green-200 rounded-2xl shadow-lg animate-pulse">
            <div className="flex items-center gap-2 lg:gap-3">
              <CheckCircle2 className="w-5 h-5 lg:w-6 lg:h-6 text-green-600 flex-shrink-0" />
              <p className="text-green-700 font-semibold text-sm lg:text-base">{success}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        {/* <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl p-4 lg:p-6 mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex-1 py-3 lg:py-4 px-6 lg:px-8 rounded-xl lg:rounded-2xl font-bold text-base lg:text-lg transition-all duration-300 ${currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-2xl transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
            >
              <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 inline mr-2 lg:mr-3" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('attendance')}
              className={`flex-1 py-3 lg:py-4 px-6 lg:px-8 rounded-xl lg:rounded-2xl font-bold text-base lg:text-lg transition-all duration-300 ${currentView === 'attendance'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-2xl transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
            >
              <Calendar className="w-5 h-5 lg:w-6 lg:h-6 inline mr-2 lg:mr-3" />
              Take Attendance
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 lg:px-6 py-3 lg:py-4 bg-purple-100 text-purple-700 rounded-xl lg:rounded-2xl hover:bg-purple-200 transition-all duration-300 hover:scale-105 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 lg:w-6 lg:h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div> */}

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-8 lg:space-y-12">
            {/* Class Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
              {classes.map(cls => <ClassCard key={cls.name} classInfo={cls} />)}
            </div>

            {/* All Children Section */}
            <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl p-4 lg:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 lg:mb-8">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-1 lg:mb-2">All Children</h2>
                  <p className="text-gray-600 text-sm lg:text-base">Manage and view all registered children</p>
                </div>
                <div className="flex gap-2 lg:gap-3">
                  <button
                    onClick={() => setShowAddChild(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 lg:py-3 px-4 lg:px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm lg:text-base"
                  >
                    <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                    Add Child
                  </button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search children..."
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>
                <div className="relative w-full sm:w-auto">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={attendanceFilter}
                    onChange={e => setAttendanceFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-sm appearance-none sm:appearance-auto"
                  >
                    <option value="all">All Children</option>
                    <option value="present">Present Today</option>
                    <option value="absent">Absent Today</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 lg:py-16">
                  <Loader className="w-6 h-6 lg:w-8 lg:h-8 animate-spin text-blue-600" />
                  <span className="ml-2 lg:ml-3 text-gray-600 text-base lg:text-lg">Loading children...</span>
                </div>
              ) : (
                <>
                  {(searchTerm || attendanceFilter !== 'all') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                      {filteredChildren.length > 0 ? (
                        filteredChildren.map(child => (
                          <ChildCard key={child.id} child={child} />
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8 text-gray-500">
                          No children match your search/filter criteria
                        </div>
                      )}
                    </div>
                  )}
                  {!searchTerm && attendanceFilter === 'all' && (
                    <div className="text-center py-12 text-gray-400">
                      Start typing to search or apply filters to view children
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Attendance Reports */}
            <AttendanceGraph attendanceRecords={allAttendanceRecords} children={children} />
          </div>
        )}

        {/* Attendance View */}
        {currentView === 'attendance' && <AttendanceView />}

        {/* Loading overlay for child details */}
        {detailsLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 flex items-center gap-3">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-gray-700 font-medium">Loading child details...</span>
            </div>
          </div>
        )}

        {/* Modals */}
        {showAddChild && <AddChildForm />}

        {showChildDetails && selectedChild && (
          <ChildDetailsModal
            child={selectedChild}
            onClose={() => {
              setShowChildDetails(false);
              setSelectedChild(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedChildrensChurchAttendance;