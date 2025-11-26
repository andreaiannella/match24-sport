"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Club, Match, Slot } from "@/types";
import { Calendar, Users, TrendingUp, Plus, Clock, CheckCircle2 } from "lucide-react";
import { MOCK_SLOTS } from "@/data/mockData";

export default function ClubDashboard() {
    const [club, setClub] = useState<Club | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [slots, setSlots] = useState<Slot[]>(MOCK_SLOTS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clubRes, matchesRes] = await Promise.all([
                    fetch("/api/club/overview"),
                    fetch("/api/club/matches")
                ]);

                const clubData = await clubRes.json();
                const matchesData = await matchesRes.json();

                setClub(clubData);
                setMatches(matchesData);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <DashboardLayout role="club">
                <div className="flex items-center justify-center h-96 text-emerald-500">
                    Caricamento...
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="club">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">{club?.name}</h1>
                    <p className="text-slate-400">Pannello di gestione</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Impostazioni</Button>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuova Prenotazione
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Occupazione Oggi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-400">85%</div>
                        <p className="text-xs text-slate-500 mt-1">6 slot ancora liberi</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Partite Match24</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">12</div>
                        <p className="text-xs text-slate-500 mt-1">Generate questo mese</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Nuovi Giocatori</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">+24</div>
                        <p className="text-xs text-slate-500 mt-1">Questa settimana</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Incasso Stimato</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">€1.2k</div>
                        <p className="text-xs text-slate-500 mt-1">Oggi</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content - Slots & Matches */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Empty Slots Management */}
                    <Card className="border-slate-800 bg-slate-900/80">
                        <CardHeader>
                            <CardTitle>Segnala Slot Vuoti</CardTitle>
                            <CardDescription>Match24 proverà a riempirli con giocatori compatibili.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <Input type="date" className="md:col-span-1" />
                                <Input type="time" className="md:col-span-1" />
                                <select className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:ring-emerald-500 md:col-span-1">
                                    <option>Padel 1</option>
                                    <option>Padel 2</option>
                                    <option>Calcetto A</option>
                                </select>
                                <Button className="md:col-span-1">Aggiungi Slot</Button>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-slate-400 mb-2">Slot in lavorazione</h4>
                                {slots.map(slot => (
                                    <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <div>
                                                <p className="font-medium text-white">{slot.startTime} - {slot.endTime}</p>
                                                <p className="text-xs text-slate-500">{slot.courtName} • {slot.sport}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                                            In riempimento
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Match24 Matches List */}
                    <Card className="border-slate-800 bg-slate-900/80">
                        <CardHeader>
                            <CardTitle>Partite Match24</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-400">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                                        <tr>
                                            <th className="px-4 py-3">Orario</th>
                                            <th className="px-4 py-3">Campo</th>
                                            <th className="px-4 py-3">Sport</th>
                                            <th className="px-4 py-3">Giocatori</th>
                                            <th className="px-4 py-3">Stato</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matches.map(match => (
                                            <tr key={match.id} className="border-b border-slate-800 hover:bg-slate-900/50">
                                                <td className="px-4 py-3 font-medium text-white">
                                                    {new Date(match.date).toLocaleDateString()} {match.time}
                                                </td>
                                                <td className="px-4 py-3">{match.courtName}</td>
                                                <td className="px-4 py-3 capitalize">{match.sport}</td>
                                                <td className="px-4 py-3">{match.playersCurrent}/{match.playersMax}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={match.status === 'confirmed' ? 'default' : 'secondary'}>
                                                        {match.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Right - Plan & Quick Actions */}
                <div className="space-y-6">
                    <Card className="border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-950/20">
                        <CardHeader>
                            <CardTitle className="text-emerald-400">Partner Plus</CardTitle>
                            <CardDescription>Il tuo piano attuale</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm text-slate-300 mb-4">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Commissioni ridotte</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Priorità riempimento</li>
                            </ul>
                            <Button variant="outline" className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">Gestisci Piano</Button>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-800 bg-slate-900/50">
                        <CardHeader>
                            <CardTitle className="text-base">Azioni Rapide</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button variant="secondary" className="justify-start">
                                <Calendar className="w-4 h-4 mr-2" />
                                Vedi Agenda Completa
                            </Button>
                            <Button variant="secondary" className="justify-start">
                                <Users className="w-4 h-4 mr-2" />
                                Lista Giocatori
                            </Button>
                            <Button variant="secondary" className="justify-start">
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Report Mensile
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
