
import { VotingCenter } from './types';

export const votingCenters: VotingCenter[] = [
  {
    id: '1',
    centerNumber: '০১',
    name: 'পতেঙ্গা উচ্চ বিদ্যালয়',
    boothCount: '১০',
    voterCount: '৪০০০',
    roomLocation: 'প্রধান ভবন, ২য় তলা',
    locationLink: 'https://maps.app.goo.gl/3Xp5Y6rJ7k9L8m2n1',
    importantPersons: [
      { id: 'p1', name: 'লেঃ কর্নেল মাহমুদ', designation: 'ক্যাম্প কমান্ডার', mobile: '01712345678' },
      { id: 'p2', name: 'মেজর সাঈদ', designation: 'অপারেশন অফিসার', mobile: '01812345679' }
    ]
  },
  {
    id: '2',
    centerNumber: '০২',
    name: 'ইপিজেড পাবলিক স্কুল অ্যান্ড কলেজ',
    boothCount: '১৫',
    voterCount: '৬২০০',
    roomLocation: 'এ-ব্লক মাঠ সংলগ্ন',
    locationLink: 'https://maps.app.goo.gl/8vU1mN2b3v4c5x6z7',
    importantPersons: [
      { id: 'p3', name: 'ক্যাপ্টেন ফয়সাল', designation: 'সেক্টর ইনচার্জ', mobile: '01912345680' },
      { id: 'p4', name: 'ওয়ারেন্ট অফিসার আজিজ', designation: 'লজিস্টিক ইনচার্জ', mobile: '01512345681' }
    ]
  },
  {
    id: '3',
    centerNumber: '০৩',
    name: 'বন্দর নগরী সরকারি প্রাথমিক বিদ্যালয়',
    boothCount: '০৮',
    voterCount: '৩২০০',
    roomLocation: 'বন্দর গেট সংলগ্ন',
    locationLink: 'https://maps.app.goo.gl/9Q1w2e3r4t5y6u7i8',
    importantPersons: [
      { id: 'p5', name: 'লেঃ রফিক', designation: 'পেট্রোল কমান্ডার', mobile: '01312345682' }
    ]
  }
];
