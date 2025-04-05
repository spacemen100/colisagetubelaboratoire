import { 
  User, InsertUser, 
  Lab, InsertLab, 
  Tube, InsertTube, 
  Box, InsertBox, 
  Alert, InsertAlert, 
  Activity, InsertActivity,
  DashboardStats,
  RecentBox,
  RecentActivity,
  users,
  laboratories,
  tubes,
  boxes,
  alerts,
  activities
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, desc, SQL, sql } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);
const scryptAsync = promisify(scrypt);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByBarcode(barcode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<Omit<User, "id" | "createdAt" | "password">>): Promise<User | undefined>;
  
  // Lab management
  getLab(id: number): Promise<Lab | undefined>;
  getLabs(): Promise<Lab[]>;
  createLab(lab: InsertLab): Promise<Lab>;
  
  // Tube management
  getTube(id: number): Promise<Tube | undefined>;
  getTubeByBarcode(barcode: string): Promise<Tube | undefined>;
  getTubesByLab(labId: number, status?: string): Promise<Tube[]>;
  createTube(tube: InsertTube): Promise<Tube>;
  updateTubeStatus(id: number, status: string): Promise<Tube | undefined>;
  assignTubeToBox(tubeId: number, boxId: number): Promise<Tube | undefined>;
  removeTubeFromBox(tubeId: number): Promise<Tube | undefined>;
  
  // Box management
  getBox(id: number): Promise<Box | undefined>;
  getBoxByBarcode(barcode: string): Promise<Box | undefined>;
  getBoxesByLab(labId: number, status?: string): Promise<Box[]>;
  createBox(box: InsertBox): Promise<Box>;
  updateBoxStatus(id: number, status: string): Promise<Box | undefined>;
  updateBoxPickup(id: number, transporterId: string): Promise<Box | undefined>;
  updateBoxDelivery(id: number): Promise<Box | undefined>;
  mergeBoxes(sourceBoxId: number, targetBoxId: number): Promise<Box | undefined>;
  
  // Alert management
  getAlert(id: number): Promise<Alert | undefined>;
  getAlertsByLab(labId: number, resolved?: boolean): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  resolveAlert(id: number): Promise<Alert | undefined>;
  
  // Activity management
  getActivitiesByLab(labId: number, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Dashboard stats
  getDashboardStats(labId: number): Promise<DashboardStats>;
  getRecentBoxes(labId: number, limit?: number): Promise<RecentBox[]>;
  getRecentActivities(labId: number, limit?: number): Promise<RecentActivity[]>;
  
  // Session store
  sessionStore: any;
  
  // Password handling
  hashPassword(password: string): Promise<string>;
  comparePasswords(supplied: string, stored: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private labs: Map<number, Lab>;
  private tubes: Map<number, Tube>;
  private boxes: Map<number, Box>;
  private alerts: Map<number, Alert>;
  private activities: Map<number, Activity>;
  
  userCurrentId: number;
  labCurrentId: number;
  tubeCurrentId: number;
  boxCurrentId: number;
  alertCurrentId: number;
  activityCurrentId: number;
  
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.labs = new Map();
    this.tubes = new Map();
    this.boxes = new Map();
    this.alerts = new Map();
    this.activities = new Map();
    
    this.userCurrentId = 1;
    this.labCurrentId = 1;
    this.tubeCurrentId = 1;
    this.boxCurrentId = 1;
    this.alertCurrentId = 1;
    this.activityCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize with some default data
    this.initializeDefaultData();
  }
  
  private async initializeDefaultData() {
    // Create default labs
    const labs = [
      { name: "Laboratoire A", code: "LAB-A" },
      { name: "Laboratoire B", code: "LAB-B" },
      { name: "Laboratoire C", code: "LAB-C" }
    ];
    
    for (const lab of labs) {
      await this.createLab(lab);
    }
    
    // Create admin user
    const adminPassword = await this.hashPassword("admin123");
    await this.createUser({
      username: "admin",
      password: adminPassword,
      name: "Admin User",
      role: "Admin",
      barcode: "EMP-001"
    });
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByBarcode(barcode: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.barcode === barcode,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<Omit<User, "id" | "createdAt" | "password">>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = { 
      ...user, 
      ...userData
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Lab methods
  async getLab(id: number): Promise<Lab | undefined> {
    return this.labs.get(id);
  }
  
  async getLabs(): Promise<Lab[]> {
    return Array.from(this.labs.values());
  }
  
  async createLab(lab: InsertLab): Promise<Lab> {
    const id = this.labCurrentId++;
    const newLab: Lab = { ...lab, id };
    this.labs.set(id, newLab);
    return newLab;
  }
  
  // Tube methods
  async getTube(id: number): Promise<Tube | undefined> {
    return this.tubes.get(id);
  }
  
  async getTubeByBarcode(barcode: string): Promise<Tube | undefined> {
    return Array.from(this.tubes.values()).find(
      (tube) => tube.barcode === barcode
    );
  }
  
  async getTubesByLab(labId: number, status?: string): Promise<Tube[]> {
    let tubes = Array.from(this.tubes.values()).filter(
      (tube) => tube.labId === labId
    );
    
    if (status) {
      tubes = tubes.filter((tube) => tube.status === status);
    }
    
    return tubes;
  }
  
  async createTube(tube: InsertTube): Promise<Tube> {
    const id = this.tubeCurrentId++;
    const now = new Date();
    const newTube: Tube = { 
      ...tube, 
      id, 
      status: "pending", 
      boxId: null, 
      createdAt: now, 
      lastUpdated: now 
    };
    this.tubes.set(id, newTube);
    return newTube;
  }
  
  async updateTubeStatus(id: number, status: string): Promise<Tube | undefined> {
    const tube = this.tubes.get(id);
    if (!tube) return undefined;
    
    const updatedTube: Tube = { 
      ...tube, 
      status, 
      lastUpdated: new Date() 
    };
    this.tubes.set(id, updatedTube);
    return updatedTube;
  }
  
  async assignTubeToBox(tubeId: number, boxId: number): Promise<Tube | undefined> {
    const tube = this.tubes.get(tubeId);
    if (!tube) return undefined;
    
    const box = this.boxes.get(boxId);
    if (!box) return undefined;
    
    // Check if temperature requirement matches box type
    if (tube.temperatureRequirement !== box.temperatureType) {
      return undefined;
    }
    
    const updatedTube: Tube = { 
      ...tube, 
      boxId, 
      status: "boxed", 
      lastUpdated: new Date() 
    };
    this.tubes.set(tubeId, updatedTube);
    
    // Update box tube count
    const updatedBox: Box = {
      ...box,
      tubeCount: box.tubeCount + 1,
      lastUpdated: new Date()
    };
    this.boxes.set(boxId, updatedBox);
    
    return updatedTube;
  }
  
  async removeTubeFromBox(tubeId: number): Promise<Tube | undefined> {
    const tube = this.tubes.get(tubeId);
    if (!tube || !tube.boxId) return undefined;
    
    const box = this.boxes.get(tube.boxId);
    if (!box) return undefined;
    
    const updatedTube: Tube = { 
      ...tube, 
      boxId: null, 
      status: "pending", 
      lastUpdated: new Date() 
    };
    this.tubes.set(tubeId, updatedTube);
    
    // Update box tube count
    const updatedBox: Box = {
      ...box,
      tubeCount: Math.max(0, box.tubeCount - 1),
      lastUpdated: new Date()
    };
    this.boxes.set(box.id, updatedBox);
    
    return updatedTube;
  }
  
  // Box methods
  async getBox(id: number): Promise<Box | undefined> {
    return this.boxes.get(id);
  }
  
  async getBoxByBarcode(barcode: string): Promise<Box | undefined> {
    return Array.from(this.boxes.values()).find(
      (box) => box.barcode === barcode
    );
  }
  
  async getBoxesByLab(labId: number, status?: string): Promise<Box[]> {
    let boxes = Array.from(this.boxes.values()).filter(
      (box) => box.sourceLabId === labId
    );
    
    if (status) {
      boxes = boxes.filter((box) => box.status === status);
    }
    
    return boxes;
  }
  
  async createBox(box: InsertBox): Promise<Box> {
    const id = this.boxCurrentId++;
    const now = new Date();
    const newBox: Box = { 
      ...box, 
      id, 
      tubeCount: 0, 
      status: "open", 
      pickupDate: null, 
      deliveryDate: null, 
      transporterId: null, 
      createdAt: now, 
      lastUpdated: now 
    };
    this.boxes.set(id, newBox);
    return newBox;
  }
  
  async updateBoxStatus(id: number, status: string): Promise<Box | undefined> {
    const box = this.boxes.get(id);
    if (!box) return undefined;
    
    const updatedBox: Box = { 
      ...box, 
      status, 
      lastUpdated: new Date() 
    };
    this.boxes.set(id, updatedBox);
    return updatedBox;
  }
  
  async updateBoxPickup(id: number, transporterId: string): Promise<Box | undefined> {
    const box = this.boxes.get(id);
    if (!box) return undefined;
    
    const updatedBox: Box = { 
      ...box, 
      status: "in_transit",
      transporterId,
      pickupDate: new Date(),
      lastUpdated: new Date() 
    };
    this.boxes.set(id, updatedBox);
    return updatedBox;
  }
  
  async updateBoxDelivery(id: number): Promise<Box | undefined> {
    const box = this.boxes.get(id);
    if (!box) return undefined;
    
    const updatedBox: Box = { 
      ...box, 
      status: "delivered",
      deliveryDate: new Date(),
      lastUpdated: new Date() 
    };
    this.boxes.set(id, updatedBox);
    return updatedBox;
  }
  
  async mergeBoxes(sourceBoxId: number, targetBoxId: number): Promise<Box | undefined> {
    const sourceBox = this.boxes.get(sourceBoxId);
    const targetBox = this.boxes.get(targetBoxId);
    
    if (!sourceBox || !targetBox) return undefined;
    
    // Check if boxes have same temperature type
    if (sourceBox.temperatureType !== targetBox.temperatureType) {
      return undefined;
    }
    
    // Get all tubes from source box
    const sourceBoxTubes = Array.from(this.tubes.values()).filter(
      (tube) => tube.boxId === sourceBoxId
    );
    
    // Move tubes to target box
    for (const tube of sourceBoxTubes) {
      const updatedTube: Tube = {
        ...tube,
        boxId: targetBoxId,
        lastUpdated: new Date()
      };
      this.tubes.set(tube.id, updatedTube);
    }
    
    // Update target box tube count
    const updatedTargetBox: Box = {
      ...targetBox,
      tubeCount: targetBox.tubeCount + sourceBox.tubeCount,
      lastUpdated: new Date()
    };
    this.boxes.set(targetBoxId, updatedTargetBox);
    
    // Update source box 
    const updatedSourceBox: Box = {
      ...sourceBox,
      status: "merged",
      tubeCount: 0,
      lastUpdated: new Date()
    };
    this.boxes.set(sourceBoxId, updatedSourceBox);
    
    return updatedTargetBox;
  }
  
  // Alert methods
  async getAlert(id: number): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }
  
  async getAlertsByLab(labId: number, resolved?: boolean): Promise<Alert[]> {
    let alerts = Array.from(this.alerts.values()).filter(
      (alert) => alert.labId === labId
    );
    
    if (resolved !== undefined) {
      alerts = alerts.filter((alert) => alert.resolved === resolved);
    }
    
    return alerts;
  }
  
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = this.alertCurrentId++;
    const now = new Date();
    const newAlert: Alert = { 
      ...alert, 
      id, 
      resolved: false, 
      createdAt: now 
    };
    this.alerts.set(id, newAlert);
    return newAlert;
  }
  
  async resolveAlert(id: number): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    const updatedAlert: Alert = { 
      ...alert, 
      resolved: true 
    };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }
  
  // Activity methods
  async getActivitiesByLab(labId: number, limit: number = 10): Promise<Activity[]> {
    const activities = Array.from(this.activities.values())
      .filter((activity) => activity.labId === labId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    
    return activities;
  }
  
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.activityCurrentId++;
    const now = new Date();
    const newActivity: Activity = { 
      ...activity, 
      id, 
      createdAt: now 
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }
  
  // Dashboard stats
  async getDashboardStats(labId: number): Promise<DashboardStats> {
    const tubes = Array.from(this.tubes.values()).filter(
      (tube) => tube.labId === labId
    );
    
    const boxes = Array.from(this.boxes.values()).filter(
      (box) => box.sourceLabId === labId
    );
    
    const activeAlerts = Array.from(this.alerts.values()).filter(
      (alert) => alert.labId === labId && !alert.resolved
    );
    
    // Count by temperature and status
    const pendingSamples = tubes.filter(tube => tube.status === "pending").length;
    
    const ambientTubes = tubes.filter(tube => tube.temperatureRequirement === "ambient" && tube.status === "pending").length;
    const coldTubes = tubes.filter(tube => tube.temperatureRequirement === "cold" && tube.status === "pending").length;
    const frozenTubes = tubes.filter(tube => tube.temperatureRequirement === "frozen" && tube.status === "pending").length;
    
    const readyBoxes = boxes.filter(box => box.status === "ready").length;
    const ambientBoxes = boxes.filter(box => box.temperatureType === "ambient" && box.status === "ready").length;
    const coldBoxes = boxes.filter(box => box.temperatureType === "cold" && box.status === "ready").length;
    const frozenBoxes = boxes.filter(box => box.temperatureType === "frozen" && box.status === "ready").length;
    
    const inTransit = boxes.filter(box => box.status === "in_transit").length;
    const ambientInTransit = boxes.filter(box => box.temperatureType === "ambient" && box.status === "in_transit").length;
    const coldInTransit = boxes.filter(box => box.temperatureType === "cold" && box.status === "in_transit").length;
    const frozenInTransit = boxes.filter(box => box.temperatureType === "frozen" && box.status === "in_transit").length;
    
    return {
      pendingSamples,
      readyBoxes,
      inTransit,
      activeAlerts: activeAlerts.length,
      ambientTubes,
      ambientBoxes,
      ambientInTransit,
      coldTubes,
      coldBoxes,
      coldInTransit,
      frozenTubes,
      frozenBoxes,
      frozenInTransit
    };
  }
  
  async getRecentBoxes(labId: number, limit: number = 3): Promise<RecentBox[]> {
    const boxes = Array.from(this.boxes.values())
      .filter((box) => box.sourceLabId === labId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    
    return boxes.map(box => ({
      id: box.id,
      code: box.barcode,
      type: box.temperatureType as any,
      status: box.status,
      content: `${box.tubeCount} tubes`
    }));
  }
  
  async getRecentActivities(labId: number, limit: number = 4): Promise<RecentActivity[]> {
    const activities = await this.getActivitiesByLab(labId, limit);
    
    return Promise.all(activities.map(async activity => {
      let user = "Système";
      let icon = "ri-information-line";
      let iconBgColor = "bg-blue-100";
      
      if (activity.userId) {
        const userObj = await this.getUser(activity.userId);
        if (userObj) {
          user = userObj.name;
        }
      }
      
      // Set icon based on activity type
      if (activity.type === "box_created") {
        icon = "ri-inbox-line";
        iconBgColor = "bg-blue-100";
      } else if (activity.type === "box_pickup") {
        icon = "ri-truck-line";
        iconBgColor = "bg-purple-100";
      } else if (activity.type === "tube_scanned") {
        icon = "ri-scanner-line";
        iconBgColor = "bg-green-100";
      } else if (activity.type === "alert") {
        icon = "ri-alert-line";
        iconBgColor = "bg-red-100";
      }
      
      // Format time
      const timeAgo = this.getTimeAgo(activity.createdAt);
      
      return {
        id: activity.id,
        type: activity.type,
        message: activity.details?.message || activity.type,
        time: timeAgo,
        user,
        icon,
        iconBgColor
      };
    }));
  }
  
  private getTimeAgo(date: Date | null): string {
    if (!date) return "Date inconnue";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) {
      return "À l'instant";
    } else if (diffMins < 60) {
      return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    } else if (diffMins < 24 * 60) {
      const diffHours = Math.floor(diffMins / 60);
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffDays = Math.floor(diffMins / (24 * 60));
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }
  
  async getUserByBarcode(barcode: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.barcode, barcode));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<Omit<User, "id" | "createdAt" | "password">>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  // Lab methods
  async getLab(id: number): Promise<Lab | undefined> {
    const [lab] = await db
      .select()
      .from(laboratories)
      .where(eq(laboratories.id, id));
    return lab;
  }
  
  async getLabs(): Promise<Lab[]> {
    return await db.select().from(laboratories);
  }
  
  async createLab(lab: InsertLab): Promise<Lab> {
    const [newLab] = await db
      .insert(laboratories)
      .values(lab)
      .returning();
    return newLab;
  }
  
  // Tube methods
  async getTube(id: number): Promise<Tube | undefined> {
    const [tube] = await db
      .select()
      .from(tubes)
      .where(eq(tubes.id, id));
    return tube;
  }
  
  async getTubeByBarcode(barcode: string): Promise<Tube | undefined> {
    const [tube] = await db
      .select()
      .from(tubes)
      .where(eq(tubes.barcode, barcode));
    return tube;
  }
  
  async getTubesByLab(labId: number, status?: string): Promise<Tube[]> {
    if (status) {
      return await db
        .select()
        .from(tubes)
        .where(and(eq(tubes.labId, labId), eq(tubes.status, status)));
    }
    
    return await db
      .select()
      .from(tubes)
      .where(eq(tubes.labId, labId));
  }
  
  async createTube(tube: InsertTube): Promise<Tube> {
    const now = new Date();
    const [newTube] = await db
      .insert(tubes)
      .values({
        ...tube,
        status: "pending", 
        boxId: null, 
        lastUpdated: now
      })
      .returning();
    return newTube;
  }
  
  async updateTubeStatus(id: number, status: string): Promise<Tube | undefined> {
    const [updatedTube] = await db
      .update(tubes)
      .set({
        status,
        lastUpdated: new Date()
      })
      .where(eq(tubes.id, id))
      .returning();
    return updatedTube;
  }
  
  async assignTubeToBox(tubeId: number, boxId: number): Promise<Tube | undefined> {
    // First get the tube and box
    const [tube] = await db
      .select()
      .from(tubes)
      .where(eq(tubes.id, tubeId));
    
    if (!tube) return undefined;
    
    const [box] = await db
      .select()
      .from(boxes)
      .where(eq(boxes.id, boxId));
    
    if (!box) return undefined;
    
    // Check if temperature requirement matches box type
    if (tube.temperatureRequirement !== box.temperatureType) {
      return undefined;
    }
    
    // Update the tube
    const [updatedTube] = await db
      .update(tubes)
      .set({
        boxId,
        status: "boxed",
        lastUpdated: new Date()
      })
      .where(eq(tubes.id, tubeId))
      .returning();
    
    // Update box tube count
    await db
      .update(boxes)
      .set({
        tubeCount: box.tubeCount + 1,
        lastUpdated: new Date()
      })
      .where(eq(boxes.id, boxId));
    
    return updatedTube;
  }
  
  async removeTubeFromBox(tubeId: number): Promise<Tube | undefined> {
    // First get the tube
    const [tube] = await db
      .select()
      .from(tubes)
      .where(eq(tubes.id, tubeId));
    
    if (!tube || !tube.boxId) return undefined;
    
    // Get the box
    const [box] = await db
      .select()
      .from(boxes)
      .where(eq(boxes.id, tube.boxId));
    
    if (!box) return undefined;
    
    // Update the tube
    const [updatedTube] = await db
      .update(tubes)
      .set({
        boxId: null,
        status: "pending",
        lastUpdated: new Date()
      })
      .where(eq(tubes.id, tubeId))
      .returning();
    
    // Update box tube count
    await db
      .update(boxes)
      .set({
        tubeCount: Math.max(0, box.tubeCount - 1),
        lastUpdated: new Date()
      })
      .where(eq(boxes.id, box.id));
    
    return updatedTube;
  }
  
  // Box methods
  async getBox(id: number): Promise<Box | undefined> {
    const [box] = await db
      .select()
      .from(boxes)
      .where(eq(boxes.id, id));
    return box;
  }
  
  async getBoxByBarcode(barcode: string): Promise<Box | undefined> {
    const [box] = await db
      .select()
      .from(boxes)
      .where(eq(boxes.barcode, barcode));
    return box;
  }
  
  async getBoxesByLab(labId: number, status?: string): Promise<Box[]> {
    if (status) {
      return await db
        .select()
        .from(boxes)
        .where(and(eq(boxes.sourceLabId, labId), eq(boxes.status, status)));
    }
    
    return await db
      .select()
      .from(boxes)
      .where(eq(boxes.sourceLabId, labId));
  }
  
  async createBox(box: InsertBox): Promise<Box> {
    const now = new Date();
    const [newBox] = await db
      .insert(boxes)
      .values({
        ...box,
        tubeCount: 0,
        status: "open",
        pickupDate: null,
        deliveryDate: null,
        transporterId: null,
        lastUpdated: now
      })
      .returning();
    return newBox;
  }
  
  async updateBoxStatus(id: number, status: string): Promise<Box | undefined> {
    const [updatedBox] = await db
      .update(boxes)
      .set({
        status,
        lastUpdated: new Date()
      })
      .where(eq(boxes.id, id))
      .returning();
    return updatedBox;
  }
  
  async updateBoxPickup(id: number, transporterId: string): Promise<Box | undefined> {
    const [updatedBox] = await db
      .update(boxes)
      .set({
        status: "in_transit",
        transporterId,
        pickupDate: new Date(),
        lastUpdated: new Date()
      })
      .where(eq(boxes.id, id))
      .returning();
    return updatedBox;
  }
  
  async updateBoxDelivery(id: number): Promise<Box | undefined> {
    const [updatedBox] = await db
      .update(boxes)
      .set({
        status: "delivered",
        deliveryDate: new Date(),
        lastUpdated: new Date()
      })
      .where(eq(boxes.id, id))
      .returning();
    return updatedBox;
  }
  
  async mergeBoxes(sourceBoxId: number, targetBoxId: number): Promise<Box | undefined> {
    // First get source and target boxes
    const [sourceBox] = await db
      .select()
      .from(boxes)
      .where(eq(boxes.id, sourceBoxId));
    
    const [targetBox] = await db
      .select()
      .from(boxes)
      .where(eq(boxes.id, targetBoxId));
    
    if (!sourceBox || !targetBox) return undefined;
    
    // Check if boxes have same temperature type
    if (sourceBox.temperatureType !== targetBox.temperatureType) {
      return undefined;
    }
    
    // Get all tubes from source box
    const tubesInSourceBox = await db
      .select()
      .from(tubes)
      .where(eq(tubes.boxId, sourceBoxId));
    
    // Move tubes to target box
    for (const tube of tubesInSourceBox) {
      await db
        .update(tubes)
        .set({
          boxId: targetBoxId,
          lastUpdated: new Date()
        })
        .where(eq(tubes.id, tube.id));
    }
    
    // Update target box
    const [updatedTargetBox] = await db
      .update(boxes)
      .set({
        tubeCount: targetBox.tubeCount + sourceBox.tubeCount,
        lastUpdated: new Date()
      })
      .where(eq(boxes.id, targetBoxId))
      .returning();
    
    // Update source box
    await db
      .update(boxes)
      .set({
        status: "merged",
        tubeCount: 0,
        lastUpdated: new Date()
      })
      .where(eq(boxes.id, sourceBoxId));
    
    return updatedTargetBox;
  }
  
  // Alert methods
  async getAlert(id: number): Promise<Alert | undefined> {
    const [alert] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.id, id));
    return alert;
  }
  
  async getAlertsByLab(labId: number, resolved?: boolean): Promise<Alert[]> {
    if (resolved !== undefined) {
      return await db
        .select()
        .from(alerts)
        .where(and(eq(alerts.labId, labId), eq(alerts.resolved, resolved)));
    }
    
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.labId, labId));
  }
  
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db
      .insert(alerts)
      .values({
        ...alert,
        resolved: false
      })
      .returning();
    return newAlert;
  }
  
  async resolveAlert(id: number): Promise<Alert | undefined> {
    const [updatedAlert] = await db
      .update(alerts)
      .set({
        resolved: true
      })
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
  }
  
  // Activity methods
  async getActivitiesByLab(labId: number, limit: number = 10): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.labId, labId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }
  
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return newActivity;
  }
  
  // Dashboard stats
  async getDashboardStats(labId: number): Promise<DashboardStats> {
    // Count pending samples
    const [pendingSamples] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tubes)
      .where(and(eq(tubes.labId, labId), eq(tubes.status, "pending")));
    
    // Count ambient tubes
    const [ambientTubes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tubes)
      .where(and(
        eq(tubes.labId, labId), 
        eq(tubes.status, "pending"),
        eq(tubes.temperatureRequirement, "ambient")
      ));
    
    // Count cold tubes
    const [coldTubes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tubes)
      .where(and(
        eq(tubes.labId, labId), 
        eq(tubes.status, "pending"),
        eq(tubes.temperatureRequirement, "cold")
      ));
    
    // Count frozen tubes
    const [frozenTubes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tubes)
      .where(and(
        eq(tubes.labId, labId), 
        eq(tubes.status, "pending"),
        eq(tubes.temperatureRequirement, "frozen")
      ));
    
    // Count ready boxes
    const [readyBoxes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(boxes)
      .where(and(
        eq(boxes.sourceLabId, labId), 
        eq(boxes.status, "ready")
      ));
    
    // Count ambient boxes
    const [ambientBoxes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(boxes)
      .where(and(
        eq(boxes.sourceLabId, labId), 
        eq(boxes.status, "ready"),
        eq(boxes.temperatureType, "ambient")
      ));
    
    // Count cold boxes
    const [coldBoxes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(boxes)
      .where(and(
        eq(boxes.sourceLabId, labId), 
        eq(boxes.status, "ready"),
        eq(boxes.temperatureType, "cold")
      ));
    
    // Count frozen boxes
    const [frozenBoxes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(boxes)
      .where(and(
        eq(boxes.sourceLabId, labId), 
        eq(boxes.status, "ready"),
        eq(boxes.temperatureType, "frozen")
      ));
    
    // Count in transit
    const [inTransit] = await db
      .select({ count: sql<number>`count(*)` })
      .from(boxes)
      .where(and(
        eq(boxes.sourceLabId, labId), 
        eq(boxes.status, "in_transit")
      ));
    
    // Count ambient in transit
    const [ambientInTransit] = await db
      .select({ count: sql<number>`count(*)` })
      .from(boxes)
      .where(and(
        eq(boxes.sourceLabId, labId), 
        eq(boxes.status, "in_transit"),
        eq(boxes.temperatureType, "ambient")
      ));
    
    // Count cold in transit
    const [coldInTransit] = await db
      .select({ count: sql<number>`count(*)` })
      .from(boxes)
      .where(and(
        eq(boxes.sourceLabId, labId), 
        eq(boxes.status, "in_transit"),
        eq(boxes.temperatureType, "cold")
      ));
    
    // Count frozen in transit
    const [frozenInTransit] = await db
      .select({ count: sql<number>`count(*)` })
      .from(boxes)
      .where(and(
        eq(boxes.sourceLabId, labId), 
        eq(boxes.status, "in_transit"),
        eq(boxes.temperatureType, "frozen")
      ));
    
    // Count active alerts
    const [activeAlerts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(and(
        eq(alerts.labId, labId), 
        eq(alerts.resolved, false)
      ));
    
    return {
      pendingSamples: pendingSamples?.count || 0,
      readyBoxes: readyBoxes?.count || 0,
      inTransit: inTransit?.count || 0,
      activeAlerts: activeAlerts?.count || 0,
      ambientTubes: ambientTubes?.count || 0,
      ambientBoxes: ambientBoxes?.count || 0,
      ambientInTransit: ambientInTransit?.count || 0,
      coldTubes: coldTubes?.count || 0,
      coldBoxes: coldBoxes?.count || 0,
      coldInTransit: coldInTransit?.count || 0,
      frozenTubes: frozenTubes?.count || 0,
      frozenBoxes: frozenBoxes?.count || 0,
      frozenInTransit: frozenInTransit?.count || 0
    };
  }
  
  async getRecentBoxes(labId: number, limit: number = 3): Promise<RecentBox[]> {
    const recentBoxes = await db
      .select()
      .from(boxes)
      .where(eq(boxes.sourceLabId, labId))
      .orderBy(desc(boxes.lastUpdated))
      .limit(limit);
    
    return recentBoxes.map(box => ({
      id: box.id,
      code: box.barcode,
      type: box.temperatureType as any,
      status: box.status,
      content: `${box.tubeCount} tubes`
    }));
  }
  
  async getRecentActivities(labId: number, limit: number = 4): Promise<RecentActivity[]> {
    const recentActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.labId, labId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
    
    return Promise.all(recentActivities.map(async activity => {
      let user = "Système";
      let icon = "ri-information-line";
      let iconBgColor = "bg-blue-100";
      
      if (activity.userId) {
        const [userObj] = await db
          .select()
          .from(users)
          .where(eq(users.id, activity.userId));
        
        if (userObj) {
          user = userObj.name;
        }
      }
      
      // Set icon based on activity type
      if (activity.type === "box_created") {
        icon = "ri-inbox-line";
        iconBgColor = "bg-blue-100";
      } else if (activity.type === "box_pickup") {
        icon = "ri-truck-line";
        iconBgColor = "bg-purple-100";
      } else if (activity.type === "tube_scanned") {
        icon = "ri-scanner-line";
        iconBgColor = "bg-green-100";
      } else if (activity.type === "alert") {
        icon = "ri-alert-line";
        iconBgColor = "bg-red-100";
      }
      
      // Format time
      const timeAgo = this.getTimeAgo(activity.createdAt);
      
      return {
        id: activity.id,
        type: activity.type,
        message: activity.details?.message || activity.type,
        time: timeAgo,
        user,
        icon,
        iconBgColor
      };
    }));
  }
  private getTimeAgo(date: Date | null): string {
    if (!date) return "Date inconnue";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) {
      return "À l'instant";
    } else if (diffMins < 60) {
      return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    } else if (diffMins < 24 * 60) {
      const diffHours = Math.floor(diffMins / 60);
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffDays = Math.floor(diffMins / (24 * 60));
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }
  }

  // Method to initialize default data (labs and admin user)
  async initializeDefaultData() {
    // Check if we have any labs
    const labs = await this.getLabs();
    if (labs.length === 0) {
      // Create default labs
      const defaultLabs = [
        { name: "Laboratoire A", code: "LAB-A" },
        { name: "Laboratoire B", code: "LAB-B" },
        { name: "Laboratoire C", code: "LAB-C" }
      ];
      
      for (const lab of defaultLabs) {
        await this.createLab(lab);
      }
    }
    
    // Check if we have any users
    const admin = await this.getUserByUsername("admin");
    if (!admin) {
      // Create admin user
      const adminPassword = await this.hashPassword("admin123");
      await this.createUser({
        username: "admin",
        password: adminPassword,
        name: "Admin User",
        role: "Admin",
        barcode: "EMP-001"
      });
    }
  }
}

// Create a new instance of the database storage
export const storage = new DatabaseStorage();
