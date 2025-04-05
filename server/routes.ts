import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertTubeSchema, 
  insertBoxSchema, 
  insertAlertSchema, 
  insertActivitySchema,
  temperatureSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Laboratory routes
  app.get("/api/labs", async (req, res) => {
    try {
      const labs = await storage.getLabs();
      res.json(labs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/labs/:id", async (req, res) => {
    try {
      const lab = await storage.getLab(parseInt(req.params.id));
      if (!lab) {
        return res.status(404).json({ message: "Laboratory not found" });
      }
      res.json(lab);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard routes
  app.get("/api/labs/:labId/dashboard", async (req, res) => {
    try {
      const labId = parseInt(req.params.labId);
      const stats = await storage.getDashboardStats(labId);
      const recentBoxes = await storage.getRecentBoxes(labId);
      const recentActivities = await storage.getRecentActivities(labId);
      
      res.json({
        stats,
        recentBoxes,
        recentActivities
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tube routes
  app.get("/api/tubes/:barcode", async (req, res) => {
    try {
      const tube = await storage.getTubeByBarcode(req.params.barcode);
      if (!tube) {
        return res.status(404).json({ message: "Tube not found" });
      }
      res.json(tube);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/labs/:labId/tubes", async (req, res) => {
    try {
      const labId = parseInt(req.params.labId);
      const status = req.query.status as string | undefined;
      const tubes = await storage.getTubesByLab(labId, status);
      res.json(tubes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tubes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const validatedData = insertTubeSchema.parse(req.body);
      const tube = await storage.createTube(validatedData);
      
      // Create activity log
      await storage.createActivity({
        type: "tube_created",
        details: { tubeBarcode: tube.barcode },
        userId: req.user.id,
        labId: tube.labId,
        tubeId: tube.id
      });
      
      res.status(201).json(tube);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tubes/scan-action", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { barcode, temperatureRequirement } = req.body;
      
      if (!barcode || !temperatureRequirement) {
        return res.status(400).json({ message: "Barcode and temperature requirement are required" });
      }
      
      // Validate temperature requirement
      temperatureSchema.parse(temperatureRequirement);
      
      const tube = await storage.getTubeByBarcode(barcode);
      if (!tube) {
        return res.status(404).json({ message: "Tube not found" });
      }
      
      // Update tube temperature requirement
      const updatedTube = await storage.updateTubeStatus(tube.id, "assigned");
      
      // Create activity log
      await storage.createActivity({
        type: "tube_scanned",
        details: { 
          tubeBarcode: tube.barcode,
          temperatureRequirement
        },
        userId: req.user.id,
        labId: tube.labId,
        tubeId: tube.id
      });
      
      res.json(updatedTube);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid temperature requirement" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Box routes
  app.get("/api/boxes/:barcode", async (req, res) => {
    try {
      const box = await storage.getBoxByBarcode(req.params.barcode);
      if (!box) {
        return res.status(404).json({ message: "Box not found" });
      }
      
      // Get tubes in the box
      const tubes = (await storage.getTubesByLab(box.sourceLabId))
        .filter(tube => tube.boxId === box.id);
      
      res.json({
        box,
        tubes
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/labs/:labId/boxes", async (req, res) => {
    try {
      const labId = parseInt(req.params.labId);
      const status = req.query.status as string | undefined;
      const boxes = await storage.getBoxesByLab(labId, status);
      res.json(boxes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/boxes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const validatedData = insertBoxSchema.parse(req.body);
      const box = await storage.createBox(validatedData);
      
      // Create activity log
      await storage.createActivity({
        type: "box_created",
        details: { boxBarcode: box.barcode },
        userId: req.user.id,
        labId: box.sourceLabId,
        boxId: box.id
      });
      
      res.status(201).json(box);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/boxes/:boxId/add-tube", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const boxId = parseInt(req.params.boxId);
      const { tubeBarcode } = req.body;
      
      if (!tubeBarcode) {
        return res.status(400).json({ message: "Tube barcode is required" });
      }
      
      // Get the tube and box
      const tube = await storage.getTubeByBarcode(tubeBarcode);
      if (!tube) {
        return res.status(404).json({ message: "Tube not found" });
      }
      
      const box = await storage.getBox(boxId);
      if (!box) {
        return res.status(404).json({ message: "Box not found" });
      }
      
      // Check if temperature requirements match
      if (tube.temperatureRequirement !== box.temperatureType) {
        return res.status(400).json({ 
          message: `Temperature mismatch: Tube requires ${tube.temperatureRequirement}, box is for ${box.temperatureType}` 
        });
      }
      
      // Add tube to box
      const updatedTube = await storage.assignTubeToBox(tube.id, boxId);
      if (!updatedTube) {
        return res.status(400).json({ message: "Failed to add tube to box" });
      }
      
      // Create activity log
      await storage.createActivity({
        type: "tube_added_to_box",
        details: { 
          tubeBarcode: tube.barcode,
          boxBarcode: box.barcode
        },
        userId: req.user.id,
        labId: box.sourceLabId,
        tubeId: tube.id,
        boxId: box.id
      });
      
      // Get updated box
      const updatedBox = await storage.getBox(boxId);
      
      res.json({
        tube: updatedTube,
        box: updatedBox
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/boxes/:boxId/remove-tube", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const boxId = parseInt(req.params.boxId);
      const { tubeBarcode } = req.body;
      
      if (!tubeBarcode) {
        return res.status(400).json({ message: "Tube barcode is required" });
      }
      
      // Get the tube
      const tube = await storage.getTubeByBarcode(tubeBarcode);
      if (!tube) {
        return res.status(404).json({ message: "Tube not found" });
      }
      
      // Check if tube is in the box
      if (tube.boxId !== boxId) {
        return res.status(400).json({ message: "Tube is not in this box" });
      }
      
      // Remove tube from box
      const updatedTube = await storage.removeTubeFromBox(tube.id);
      if (!updatedTube) {
        return res.status(400).json({ message: "Failed to remove tube from box" });
      }
      
      // Get the box
      const box = await storage.getBox(boxId);
      if (!box) {
        return res.status(404).json({ message: "Box not found" });
      }
      
      // Create activity log
      await storage.createActivity({
        type: "tube_removed_from_box",
        details: { 
          tubeBarcode: tube.barcode,
          boxBarcode: box.barcode
        },
        userId: req.user.id,
        labId: box.sourceLabId,
        tubeId: tube.id,
        boxId: box.id
      });
      
      // Get updated box
      const updatedBox = await storage.getBox(boxId);
      
      res.json({
        tube: updatedTube,
        box: updatedBox
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/boxes/:boxId/ready", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const boxId = parseInt(req.params.boxId);
      
      // Get the box
      const box = await storage.getBox(boxId);
      if (!box) {
        return res.status(404).json({ message: "Box not found" });
      }
      
      // Update box status
      const updatedBox = await storage.updateBoxStatus(boxId, "ready");
      if (!updatedBox) {
        return res.status(400).json({ message: "Failed to update box status" });
      }
      
      // Create activity log
      await storage.createActivity({
        type: "box_ready",
        details: { boxBarcode: box.barcode },
        userId: req.user.id,
        labId: box.sourceLabId,
        boxId: box.id
      });
      
      res.json(updatedBox);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/boxes/:boxId/pickup", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const boxId = parseInt(req.params.boxId);
      const { transporterId } = req.body;
      
      if (!transporterId) {
        return res.status(400).json({ message: "Transporter ID is required" });
      }
      
      // Get the box
      const box = await storage.getBox(boxId);
      if (!box) {
        return res.status(404).json({ message: "Box not found" });
      }
      
      // Check if box is ready
      if (box.status !== "ready") {
        return res.status(400).json({ message: "Box is not ready for pickup" });
      }
      
      // Update box status
      const updatedBox = await storage.updateBoxPickup(boxId, transporterId);
      if (!updatedBox) {
        return res.status(400).json({ message: "Failed to update box status" });
      }
      
      // Create activity log
      await storage.createActivity({
        type: "box_pickup",
        details: { 
          boxBarcode: box.barcode,
          transporterId
        },
        userId: req.user.id,
        labId: box.sourceLabId,
        boxId: box.id
      });
      
      res.json(updatedBox);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/boxes/:boxId/delivery", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const boxId = parseInt(req.params.boxId);
      
      // Get the box
      const box = await storage.getBox(boxId);
      if (!box) {
        return res.status(404).json({ message: "Box not found" });
      }
      
      // Check if box is in transit
      if (box.status !== "in_transit") {
        return res.status(400).json({ message: "Box is not in transit" });
      }
      
      // Update box status
      const updatedBox = await storage.updateBoxDelivery(boxId);
      if (!updatedBox) {
        return res.status(400).json({ message: "Failed to update box status" });
      }
      
      // Create activity log
      await storage.createActivity({
        type: "box_delivery",
        details: { boxBarcode: box.barcode },
        userId: req.user.id,
        labId: box.sourceLabId,
        boxId: box.id
      });
      
      res.json(updatedBox);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/boxes/merge", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { sourceBoxId, targetBoxId } = req.body;
      
      if (!sourceBoxId || !targetBoxId) {
        return res.status(400).json({ message: "Source and target box IDs are required" });
      }
      
      // Get the boxes
      const sourceBox = await storage.getBox(parseInt(sourceBoxId));
      const targetBox = await storage.getBox(parseInt(targetBoxId));
      
      if (!sourceBox || !targetBox) {
        return res.status(404).json({ message: "One or both boxes not found" });
      }
      
      // Check if boxes have same temperature type
      if (sourceBox.temperatureType !== targetBox.temperatureType) {
        return res.status(400).json({ 
          message: `Temperature mismatch: Source box is ${sourceBox.temperatureType}, target box is ${targetBox.temperatureType}`
        });
      }
      
      // Merge boxes
      const updatedBox = await storage.mergeBoxes(parseInt(sourceBoxId), parseInt(targetBoxId));
      if (!updatedBox) {
        return res.status(400).json({ message: "Failed to merge boxes" });
      }
      
      // Create activity log
      await storage.createActivity({
        type: "boxes_merged",
        details: { 
          sourceBoxBarcode: sourceBox.barcode,
          targetBoxBarcode: targetBox.barcode
        },
        userId: req.user.id,
        labId: sourceBox.sourceLabId,
        boxId: targetBox.id
      });
      
      res.json(updatedBox);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Alert routes
  app.get("/api/labs/:labId/alerts", async (req, res) => {
    try {
      const labId = parseInt(req.params.labId);
      const resolved = req.query.resolved === "true";
      const alerts = await storage.getAlertsByLab(labId, resolved);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(validatedData);
      
      // Create activity log
      await storage.createActivity({
        type: "alert_created",
        details: { alertId: alert.id, message: alert.message },
        userId: req.user.id,
        labId: alert.labId
      });
      
      res.status(201).json(alert);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/alerts/:id/resolve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const alertId = parseInt(req.params.id);
      
      // Get the alert
      const alert = await storage.getAlert(alertId);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      // Update alert status
      const updatedAlert = await storage.resolveAlert(alertId);
      if (!updatedAlert) {
        return res.status(400).json({ message: "Failed to resolve alert" });
      }
      
      // Create activity log
      await storage.createActivity({
        type: "alert_resolved",
        details: { alertId: alert.id, message: alert.message },
        userId: req.user.id,
        labId: alert.labId
      });
      
      res.json(updatedAlert);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Activity routes
  app.get("/api/labs/:labId/activities", async (req, res) => {
    try {
      const labId = parseInt(req.params.labId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getActivitiesByLab(labId, limit);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const validatedData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(validatedData);
      res.status(201).json(activity);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
