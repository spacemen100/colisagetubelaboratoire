import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLabContext } from "@/hooks/use-lab-context";
import { 
  TestTube, 
  Package, 
  Truck, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  ArrowRight
} from "lucide-react";
import Header from "@/components/layout/header";
import TabNavigation from "@/components/layout/tab-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  DashboardStats, 
  RecentBox, 
  RecentActivity 
} from "@shared/schema";

interface DashboardData {
  stats: DashboardStats;
  recentBoxes: RecentBox[];
  recentActivities: RecentActivity[];
}

export default function DashboardPage() {
  const { currentLab } = useLabContext();

  const {
    data,
    isLoading,
    error,
  } = useQuery<DashboardData>({
    queryKey: [currentLab ? `/api/laboratories/${currentLab.id}/dashboard` : null],
    enabled: !!currentLab,
  });

  if (!currentLab) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <TabNavigation />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Veuillez sélectionner un laboratoire</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <TabNavigation />
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tableau de bord</h2>
          
          {isLoading ? (
            <div className="grid gap-4">
              {/* Loading skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center p-6">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">Une erreur est survenue lors du chargement des données</p>
              <p className="text-sm text-gray-500 mt-2">{(error as Error).message}</p>
            </div>
          ) : data ? (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Samples Card */}
                <Card className="bg-white shadow-sm border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Échantillons en attente</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">{data.stats.pendingSamples}</p>
                      </div>
                      <div className="bg-blue-100 p-2 rounded-md">
                        <TestTube className="text-primary text-xl" />
                      </div>
                    </div>
                    <div className="flex items-center mt-3">
                      <span className="text-green-600 text-sm flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />12%
                      </span>
                      <span className="text-gray-500 text-sm ml-2">depuis hier</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Boxes Card */}
                <Card className="bg-white shadow-sm border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Boîtes prêtes</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">{data.stats.readyBoxes}</p>
                      </div>
                      <div className="bg-green-100 p-2 rounded-md">
                        <Package className="text-green-600 text-xl" />
                      </div>
                    </div>
                    <div className="flex items-center mt-3">
                      <span className="text-green-600 text-sm flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />2
                      </span>
                      <span className="text-gray-500 text-sm ml-2">depuis hier</span>
                    </div>
                  </CardContent>
                </Card>

                {/* In Transit Card */}
                <Card className="bg-white shadow-sm border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-500 font-medium">En transit</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">{data.stats.inTransit}</p>
                      </div>
                      <div className="bg-purple-100 p-2 rounded-md">
                        <Truck className="text-purple-700 text-xl" />
                      </div>
                    </div>
                    <div className="flex items-center mt-3">
                      <span className="text-red-500 text-sm flex items-center">
                        <TrendingDown className="h-3 w-3 mr-1" />3
                      </span>
                      <span className="text-gray-500 text-sm ml-2">depuis hier</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Alerts Card */}
                <Card className="bg-white shadow-sm border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Alertes actives</p>
                        <p className="text-2xl font-semibold text-red-500 mt-1">{data.stats.activeAlerts}</p>
                      </div>
                      <div className="bg-red-100 p-2 rounded-md">
                        <AlertTriangle className="text-red-500 text-xl" />
                      </div>
                    </div>
                    <div className="flex items-center mt-3">
                      <Button variant="link" className="text-primary text-sm p-0 h-auto">
                        Voir les détails <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Temperature Requirements Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Ambient Card */}
                <Card className="bg-white shadow-sm border border-gray-200 overflow-hidden">
                  <div className="border-l-4 border-green-500 px-4 py-3">
                    <h3 className="font-medium text-gray-800">Température ambiante</h3>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-gray-500">Tubes en attente</p>
                      <p className="text-lg font-semibold text-gray-800">{data.stats.ambientTubes}</p>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-gray-500">Boîtes prêtes</p>
                      <p className="text-lg font-semibold text-gray-800">{data.stats.ambientBoxes}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">En transit</p>
                      <p className="text-lg font-semibold text-gray-800">{data.stats.ambientInTransit}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Cold (4°C) Card */}
                <Card className="bg-white shadow-sm border border-gray-200 overflow-hidden">
                  <div className="border-l-4 border-blue-500 px-4 py-3">
                    <h3 className="font-medium text-gray-800">+4°C</h3>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-gray-500">Tubes en attente</p>
                      <p className="text-lg font-semibold text-gray-800">{data.stats.coldTubes}</p>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-gray-500">Boîtes prêtes</p>
                      <p className="text-lg font-semibold text-gray-800">{data.stats.coldBoxes}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">En transit</p>
                      <p className="text-lg font-semibold text-gray-800">{data.stats.coldInTransit}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Frozen (-20°C) Card */}
                <Card className="bg-white shadow-sm border border-gray-200 overflow-hidden">
                  <div className="border-l-4 border-purple-500 px-4 py-3">
                    <h3 className="font-medium text-gray-800">-20°C</h3>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-gray-500">Tubes en attente</p>
                      <p className="text-lg font-semibold text-gray-800">{data.stats.frozenTubes}</p>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-gray-500">Boîtes prêtes</p>
                      <p className="text-lg font-semibold text-gray-800">{data.stats.frozenBoxes}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">En transit</p>
                      <p className="text-lg font-semibold text-gray-800">{data.stats.frozenInTransit}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Boxes & Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Boxes */}
                <Card className="bg-white shadow-sm border border-gray-200">
                  <div className="border-b border-gray-200 px-6 py-4">
                    <h3 className="font-medium text-gray-800">Boîtes récentes</h3>
                  </div>
                  <CardContent className="p-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Code</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Type</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Status</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Contenu</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.recentBoxes.map((box) => (
                            <tr key={box.id}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{box.code}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge
                                  variant={
                                    box.type === "ambient" 
                                      ? "ambient" 
                                      : box.type === "cold" 
                                        ? "cold" 
                                        : "frozen"
                                  }
                                >
                                  {box.type === "ambient" 
                                    ? "Ambiante" 
                                    : box.type === "cold" 
                                      ? "+4°C" 
                                      : "-20°C"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge
                                  variant={
                                    box.status === "ready" 
                                      ? "ambient" 
                                      : box.status === "in_transit" 
                                        ? "secondary" 
                                        : "default"
                                  }
                                >
                                  {box.status === "ready" 
                                    ? "Prête" 
                                    : box.status === "in_transit" 
                                      ? "En transit" 
                                      : box.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{box.content}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-center mt-4">
                      <Button variant="link" className="text-primary text-sm">
                        Voir toutes les boîtes <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-white shadow-sm border border-gray-200">
                  <div className="border-b border-gray-200 px-6 py-4">
                    <h3 className="font-medium text-gray-800">Activité récente</h3>
                  </div>
                  <CardContent className="p-4">
                    <ul className="divide-y divide-gray-200">
                      {data.recentActivities.map((activity) => (
                        <li key={activity.id} className="py-3">
                          <div className="flex items-start">
                            <div className={`${activity.iconBgColor} p-2 rounded-full`}>
                              <i className={`${activity.icon}`}></i>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                              <p className="text-sm text-gray-500">{activity.time} • {activity.user}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-center mt-4">
                      <Button variant="link" className="text-primary text-sm">
                        Voir toute l'activité <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
