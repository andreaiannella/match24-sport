import { NextResponse } from 'next/server';
import { MOCK_MATCHES } from '@/data/mockData';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'upcoming' | 'history' | 'suggested'

    let matches = MOCK_MATCHES;

    if (type === 'suggested') {
        matches = MOCK_MATCHES.filter(m => m.isSuggested);
    } else {
        // Return all for now, or filter by date for history/upcoming
        matches = MOCK_MATCHES.filter(m => !m.isSuggested);
    }

    return NextResponse.json(matches);
}
