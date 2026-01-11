import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { SportType } from './sportsService';

export interface PlayerUploadData {
  full_name: string;
  position: string;
  jersey_number?: number;
  age?: number;
  height?: number;
  weight?: number;
  citizenship: string;
  gender: 'male' | 'female' | 'other';
  date_of_birth?: string;
  place_of_birth?: string;
  foot?: 'left' | 'right' | 'both';
  fifa_id?: string;
  bio?: string;
  market_value?: number;
  player_agent?: string;
  current_club?: string;
  joined_date?: string;
  contract_expires?: string;
}

export interface UploadValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: PlayerUploadData[];
}

export interface UploadSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  players: PlayerUploadData[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export class BulkPlayerUploadService {
  private teamId: string;
  private sportType: SportType;

  constructor(teamId: string, sportType: SportType) {
    this.teamId = teamId;
    this.sportType = sportType;
  }

  /**
   * Parse CSV or Excel file and extract player data
   */
  async parseFile(file: File): Promise<PlayerUploadData[]> {
    console.log(`📁 Parsing file: ${file.name} (${file.size} bytes)`);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      return this.parseCSV(file);
    } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
      return this.parseExcel(file);
    } else {
      throw new Error('Unsupported file format. Please use CSV or Excel files.');
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(file: File): Promise<PlayerUploadData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          console.log(`📄 Raw CSV content (first 500 chars):`, csv.substring(0, 500));
          
          const lines = csv.split('\n').filter(line => line.trim());
          console.log(`📊 Total lines found: ${lines.length}`);
          
          if (lines.length < 2) {
            throw new Error('CSV file must contain at least a header row and one data row');
          }

          const headers = this.parseCSVLine(lines[0]);
          console.log(`📋 Headers found:`, headers);
          
          const players: PlayerUploadData[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            console.log(`📝 Row ${i + 1} values:`, values);
            const player = this.mapRowToPlayer(headers, values, i + 1);
            players.push(player);
          }

          console.log(`✅ Successfully parsed ${players.length} players`);
          resolve(players);
        } catch (error) {
          console.error('❌ Error parsing CSV:', error);
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse Excel file
   */
  private async parseExcel(file: File): Promise<PlayerUploadData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length < 2) {
            throw new Error('Excel file must contain at least a header row and one data row');
          }

          const headers = jsonData[0] as string[];
          const players: PlayerUploadData[] = [];

          for (let i = 1; i < jsonData.length; i++) {
            const values = jsonData[i] as any[];
            const player = this.mapRowToPlayer(headers, values, i + 1);
            players.push(player);
          }

          resolve(players);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsBinaryString(file);
    });
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Map row data to player object
   */
  private mapRowToPlayer(headers: string[], values: any[], rowNumber: number): PlayerUploadData {
    const player: any = {};
    
    console.log(`🔍 Parsing row ${rowNumber}:`, { headers, values });
    
    headers.forEach((header, index) => {
      const value = values[index];
      const normalizedHeader = header.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      
      // Map common header variations with more comprehensive matching
      const fieldMap: { [key: string]: string } = {
        // Name variations
        'name': 'full_name',
        'full_name': 'full_name',
        'player_name': 'full_name',
        'playername': 'full_name',
        'first_name': 'full_name',
        'last_name': 'full_name',
        
        // Position variations
        'position': 'position',
        'pos': 'position',
        'role': 'position',
        
        // Jersey number variations
        'jersey_number': 'jersey_number',
        'jersey': 'jersey_number',
        'number': 'jersey_number',
        'jersey_no': 'jersey_number',
        'jerseynum': 'jersey_number',
        'shirt_number': 'jersey_number',
        'shirt_no': 'jersey_number',
        
        // Age variations
        'age': 'age',
        'years_old': 'age',
        'years': 'age',
        
        // Height variations
        'height': 'height',
        'height_cm': 'height',
        'heightcm': 'height',
        'height_in_cm': 'height',
        'tall': 'height',
        'stature': 'height',
        
        // Weight variations
        'weight': 'weight',
        'weight_kg': 'weight',
        'weightkg': 'weight',
        'weight_in_kg': 'weight',
        'mass': 'weight',
        
        // Citizenship variations
        'citizenship': 'citizenship',
        'nationality': 'citizenship',
        'country': 'citizenship',
        'nation': 'citizenship',
        'origin': 'citizenship',
        
        // Gender variations
        'gender': 'gender',
        'sex': 'gender',
        'm_f': 'gender',
        'male_female': 'gender',
        
        // Date of birth variations
        'date_of_birth': 'date_of_birth',
        'dob': 'date_of_birth',
        'birth_date': 'date_of_birth',
        'birthdate': 'date_of_birth',
        'date_of_birth_yyyy_mm_dd': 'date_of_birth',
        'birthday': 'date_of_birth',
        'born': 'date_of_birth',
        'born_date': 'date_of_birth',
        
        // Place of birth variations
        'place_of_birth': 'place_of_birth',
        'birth_place': 'place_of_birth',
        'birthplace': 'place_of_birth',
        'born_in': 'place_of_birth',
        'birth_city': 'place_of_birth',
        'birth_country': 'place_of_birth',
        
        // Foot variations
        'foot': 'foot',
        'preferred_foot': 'foot',
        'foot_preference': 'foot',
        'strong_foot': 'foot',
        'dominant_foot': 'foot',
        
        // FIFA ID variations
        'fifa_id': 'fifa_id',
        'fifa': 'fifa_id',
        'fifaid': 'fifa_id',
        'fifa_number': 'fifa_id',
        
        // Bio variations
        'bio': 'bio',
        'biography': 'bio',
        'description': 'bio',
        'notes': 'bio',
        'comments': 'bio',
        
        // Market value variations
        'market_value': 'market_value',
        'value': 'market_value',
        'marketvalue': 'market_value',
        'price': 'market_value',
        'worth': 'market_value',
        'transfer_value': 'market_value',
        
        // Agent variations
        'agent': 'player_agent',
        'player_agent': 'player_agent',
        'representative': 'player_agent',
        'manager': 'player_agent',
        
        // Club variations
        'current_club': 'current_club',
        'club': 'current_club',
        'team': 'current_club',
        'current_team': 'current_club',
        'present_club': 'current_club',
        
        // Joined date variations
        'joined_date': 'joined_date',
        'join_date': 'joined_date',
        'joined': 'joined_date',
        'join': 'joined_date',
        'start_date': 'joined_date',
        'contract_start': 'joined_date',
        
        // Contract expiry variations
        'contract_expires': 'contract_expires',
        'contract_end': 'contract_expires',
        'contract_expiry': 'contract_expires',
        'expires': 'contract_expires',
        'end_date': 'contract_expires',
        'contract_end_date': 'contract_expires'
      };

      const fieldName = fieldMap[normalizedHeader];
      if (fieldName) {
        const parsedValue = this.parseValue(value, fieldName);
        player[fieldName] = parsedValue;
        console.log(`  ✅ Mapped "${header}" -> "${fieldName}": "${value}" -> "${parsedValue}"`);
      } else {
        console.log(`  ❌ Unmapped field: "${header}" (normalized: "${normalizedHeader}")`);
      }
    });

    console.log(`📋 Final player object for row ${rowNumber}:`, player);
    return player as PlayerUploadData;
  }

  /**
   * Parse date from various formats
   */
  private parseDate(dateString: string): string | null {
    if (!dateString || dateString.trim() === '') return null;
    
    const cleanDate = dateString.trim();
    console.log(`🗓️ Parsing date: "${cleanDate}"`);
    
    // Try parsing YYYY-MM-DD format first (ISO format) and convert to MM/DD/YYYY
    const yyyy_mm_dd = cleanDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyy_mm_dd) {
      const [, year, month, day] = yyyy_mm_dd;
      // Convert YYYY-MM-DD to MM/DD/YYYY format
      const result = `${month}/${day}/${year}`;
      console.log(`✅ YYYY-MM-DD converted: "${cleanDate}" -> "${result}"`);
      return result;
    }
    
    // Try parsing YYYY/MM/DD format and convert to MM/DD/YYYY
    const yyyy_mm_dd_slash = cleanDate.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (yyyy_mm_dd_slash) {
      const [, year, month, day] = yyyy_mm_dd_slash;
      // Convert YYYY/MM/DD to MM/DD/YYYY format
      const result = `${month}/${day}/${year}`;
      console.log(`✅ YYYY/MM/DD converted: "${cleanDate}" -> "${result}"`);
      return result;
    }
    
    // Try parsing DD/MM/YYYY format and convert to MM/DD/YYYY
    const dd_mm_yyyy = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dd_mm_yyyy) {
      const [, day, month, year] = dd_mm_yyyy;
      // Convert DD/MM/YYYY to MM/DD/YYYY format
      const result = `${month}/${day}/${year}`;
      console.log(`✅ DD/MM/YYYY converted: "${cleanDate}" -> "${result}"`);
      return result;
    }
    
    // Try parsing MM/DD/YYYY format (already in correct format)
    const mm_dd_yyyy = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mm_dd_yyyy) {
      const [, month, day, year] = mm_dd_yyyy;
      // Already in MM/DD/YYYY format, just return as is
      const result = `${month}/${day}/${year}`;
      console.log(`✅ MM/DD/YYYY (already correct): "${cleanDate}" -> "${result}"`);
      return result;
    }
    
    // Try parsing DD-MM-YYYY format and convert to MM/DD/YYYY
    const dd_mm_yyyy_dash = cleanDate.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dd_mm_yyyy_dash) {
      const [, day, month, year] = dd_mm_yyyy_dash;
      // Convert DD-MM-YYYY to MM/DD/YYYY format
      const result = `${month}/${day}/${year}`;
      console.log(`✅ DD-MM-YYYY converted: "${cleanDate}" -> "${result}"`);
      return result;
    }
    
    // Try parsing MM-DD-YYYY format and convert to MM/DD/YYYY
    const mm_dd_yyyy_dash = cleanDate.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (mm_dd_yyyy_dash) {
      const [, month, day, year] = mm_dd_yyyy_dash;
      // Convert MM-DD-YYYY to MM/DD/YYYY format
      const result = `${month}/${day}/${year}`;
      console.log(`✅ MM-DD-YYYY converted: "${cleanDate}" -> "${result}"`);
      return result;
    }
    
    // Try parsing DD.MM.YYYY format and convert to MM/DD/YYYY
    const dd_mm_yyyy_dot = cleanDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dd_mm_yyyy_dot) {
      const [, day, month, year] = dd_mm_yyyy_dot;
      // Convert DD.MM.YYYY to MM/DD/YYYY format
      const result = `${month}/${day}/${year}`;
      console.log(`✅ DD.MM.YYYY converted: "${cleanDate}" -> "${result}"`);
      return result;
    }
    
    // Try parsing DD MMM YYYY format (e.g., "15 Jan 1999") and convert to MM/DD/YYYY
    const dd_mmm_yyyy = cleanDate.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (dd_mmm_yyyy) {
      const [, day, monthName, year] = dd_mmm_yyyy;
      const parsedDate = new Date(cleanDate);
      if (!isNaN(parsedDate.getTime())) {
        // Convert to MM/DD/YYYY format
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(parsedDate.getDate()).padStart(2, '0');
        const result = `${month}/${dayStr}/${parsedDate.getFullYear()}`;
        console.log(`✅ DD MMM YYYY converted: "${cleanDate}" -> "${result}"`);
        return result;
      }
    }
    
    // Try parsing MMM DD, YYYY format (e.g., "Jan 15, 1999") and convert to MM/DD/YYYY
    const mmm_dd_yyyy = cleanDate.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
    if (mmm_dd_yyyy) {
      const parsedDate = new Date(cleanDate);
      if (!isNaN(parsedDate.getTime())) {
        // Convert to MM/DD/YYYY format
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(parsedDate.getDate()).padStart(2, '0');
        const result = `${month}/${dayStr}/${parsedDate.getFullYear()}`;
        console.log(`✅ MMM DD, YYYY converted: "${cleanDate}" -> "${result}"`);
        return result;
      }
    }
    
    // Last resort: try direct Date constructor and convert to MM/DD/YYYY
    const directDate = new Date(cleanDate);
    if (!isNaN(directDate.getTime())) {
      // Convert to MM/DD/YYYY format
      const month = String(directDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(directDate.getDate()).padStart(2, '0');
      const result = `${month}/${dayStr}/${directDate.getFullYear()}`;
      console.log(`✅ Direct parsing converted: "${cleanDate}" -> "${result}"`);
      return result;
    }
    
    console.warn(`⚠️ Could not parse date: "${cleanDate}"`);
    return null;
  }

  /**
   * Parse and validate field values
   */
  private parseValue(value: any, fieldName: string): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const stringValue = String(value).trim();

    switch (fieldName) {
      case 'jersey_number':
      case 'age':
      case 'height':
      case 'weight':
        const num = parseInt(stringValue);
        return isNaN(num) ? null : num;
      
      case 'market_value':
        const float = parseFloat(stringValue.replace(/[^0-9.-]/g, ''));
        return isNaN(float) ? null : float;
      
      case 'gender':
        const gender = stringValue.toLowerCase();
        if (['male', 'm', 'man'].includes(gender)) return 'male';
        if (['female', 'f', 'woman'].includes(gender)) return 'female';
        if (['other', 'o'].includes(gender)) return 'other';
        return 'male'; // default
      
      case 'foot':
        const foot = stringValue.toLowerCase();
        if (['left', 'l'].includes(foot)) return 'left';
        if (['right', 'r'].includes(foot)) return 'right';
        if (['both', 'b', 'ambidextrous'].includes(foot)) return 'both';
        return null;
      
      case 'date_of_birth':
      case 'joined_date':
      case 'contract_expires':
        // Try to parse various date formats
        return this.parseDate(stringValue);
      
      default:
        return stringValue;
    }
  }

  /**
   * Validate uploaded player data
   */
  async validatePlayers(players: PlayerUploadData[]): Promise<UploadSummary> {
    const errors: Array<{ row: number; field: string; message: string }> = [];
    const validPlayers: PlayerUploadData[] = [];
    let duplicateRows = 0;

    // Check for duplicates
    const nameMap = new Map<string, number[]>();
    players.forEach((player, index) => {
      if (player.full_name) {
        const name = player.full_name.toLowerCase();
        if (!nameMap.has(name)) {
          nameMap.set(name, []);
        }
        nameMap.get(name)!.push(index + 2); // +2 because index is 0-based and we skip header
      }
    });

    // Find duplicates
    nameMap.forEach((rows, name) => {
      if (rows.length > 1) {
        duplicateRows += rows.length - 1;
        rows.forEach(row => {
          errors.push({
            row,
            field: 'full_name',
            message: `Duplicate player name: ${name}`
          });
        });
      }
    });

    // Validate each player
    players.forEach((player, index) => {
      const rowNumber = index + 2; // +2 because index is 0-based and we skip header
      const playerErrors = this.validatePlayer(player, rowNumber);
      errors.push(...playerErrors);

      if (playerErrors.length === 0) {
        validPlayers.push(player);
      }
    });

    return {
      totalRows: players.length,
      validRows: validPlayers.length,
      invalidRows: errors.length - duplicateRows,
      duplicateRows,
      players: validPlayers,
      errors
    };
  }

  /**
   * Validate individual player data
   */
  private validatePlayer(player: PlayerUploadData, rowNumber: number): Array<{ row: number; field: string; message: string }> {
    const errors: Array<{ row: number; field: string; message: string }> = [];

    // Required fields
    if (!player.full_name || player.full_name.trim() === '') {
      errors.push({ row: rowNumber, field: 'full_name', message: 'Player name is required' });
    }

    if (!player.position || player.position.trim() === '') {
      errors.push({ row: rowNumber, field: 'position', message: 'Position is required' });
    }

    if (!player.citizenship || player.citizenship.trim() === '') {
      errors.push({ row: rowNumber, field: 'citizenship', message: 'Citizenship is required' });
    }

    if (!player.gender) {
      errors.push({ row: rowNumber, field: 'gender', message: 'Gender is required' });
    }

    // Validate position against sport type
    if (player.position) {
      const validPositions = this.getValidPositions();
      if (!validPositions.includes(player.position)) {
        errors.push({ 
          row: rowNumber, 
          field: 'position', 
          message: `Invalid position for ${this.sportType}. Valid positions: ${validPositions.join(', ')}` 
        });
      }
    }

    // Validate jersey number
    if (player.jersey_number !== null && player.jersey_number !== undefined) {
      if (player.jersey_number < 1 || player.jersey_number > 99) {
        errors.push({ 
          row: rowNumber, 
          field: 'jersey_number', 
          message: 'Jersey number must be between 1 and 99' 
        });
      }
    }

    // Validate age
    if (player.age !== null && player.age !== undefined) {
      if (player.age < 16 || player.age > 50) {
        errors.push({ 
          row: rowNumber, 
          field: 'age', 
          message: 'Age must be between 16 and 50' 
        });
      }
    }

    // Validate height (in cm)
    if (player.height !== null && player.height !== undefined) {
      if (player.height < 150 || player.height > 220) {
        errors.push({ 
          row: rowNumber, 
          field: 'height', 
          message: 'Height must be between 150cm and 220cm' 
        });
      }
    }

    // Validate weight (in kg)
    if (player.weight !== null && player.weight !== undefined) {
      if (player.weight < 40 || player.weight > 150) {
        errors.push({ 
          row: rowNumber, 
          field: 'weight', 
          message: 'Weight must be between 40kg and 150kg' 
        });
      }
    }

    // Validate market value
    if (player.market_value !== null && player.market_value !== undefined) {
      if (player.market_value < 0) {
        errors.push({ 
          row: rowNumber, 
          field: 'market_value', 
          message: 'Market value cannot be negative' 
        });
      }
    }

    return errors;
  }

  /**
   * Get valid positions for the current sport type
   */
  private getValidPositions(): string[] {
    const sportPositions: { [key in SportType]: string[] } = {
      football: [
        'Goalkeeper', 'Right Back', 'Left Back', 'Center Back',
        'Defensive Midfielder', 'Central Midfielder', 'Attacking Midfielder',
        'Right Winger', 'Left Winger', 'Striker', 'Second Striker'
      ],
      basketball: [
        'Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'
      ],
      volleyball: [
        'Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite Hitter', 'Libero', 'Defensive Specialist'
      ],
      tennis: [
        'Singles Player', 'Doubles Player', 'Mixed Doubles Player'
      ],
      rugby: [
        'Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8', 'Scrum Half', 'Fly Half',
        'Center', 'Wing', 'Fullback'
      ],
      american_football: [
        'Quarterback', 'Running Back', 'Wide Receiver', 'Tight End', 'Offensive Lineman',
        'Defensive Lineman', 'Linebacker', 'Cornerback', 'Safety', 'Kicker', 'Punter'
      ],
      baseball: [
        'Pitcher', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop',
        'Left Field', 'Center Field', 'Right Field', 'Designated Hitter'
      ],
      cricket: [
        'Batsman', 'Bowler', 'Wicket-Keeper', 'All-Rounder', 'Fielder'
      ],
      hockey: [
        'Goalkeeper', 'Defender', 'Midfielder', 'Forward'
      ],
      golf: ['Golfer'],
      swimming: ['Swimmer'],
      athletics: ['Athlete'],
      boxing: ['Boxer'],
      wrestling: ['Wrestler'],
      martial_arts: ['Martial Artist'],
      cycling: ['Cyclist'],
      table_tennis: ['Table Tennis Player'],
      badminton: ['Badminton Player'],
      handball: ['Handball Player'],
      water_polo: ['Water Polo Player']
    };

    return sportPositions[this.sportType] || [];
  }

  /**
   * Store uploaded file in Supabase Storage
   */
  async storeUploadedFile(file: File): Promise<string | null> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const fileName = `bulk_uploads/${this.teamId}/${Date.now()}_${file.name}`;
      
      const { error } = await supabase.storage
        .from('player-uploads')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) throw error;
      return fileName;
    } catch (error) {
      console.error('Error storing uploaded file:', error);
      return null;
    }
  }

  /**
   * Get download URL for stored file
   */
  async getFileDownloadUrl(filePath: string): Promise<string | null> {
    try {
      const { data } = await supabase.storage
        .from('player-uploads')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting file download URL:', error);
      return null;
    }
  }

  /**
   * Upload players to database with activity tracking
   */
  async uploadPlayers(players: PlayerUploadData[], file?: File, uploadSessionId?: string): Promise<{ 
    success: number; 
    errors: string[]; 
    uploadedPlayers: any[];
    uploadSessionId: string;
  }> {
    const errors: string[] = [];
    let successCount = 0;
    const uploadedPlayers: any[] = [];

    // Store file if provided
    let filePath: string | null = null;
    if (file) {
      filePath = await this.storeUploadedFile(file);
    }

    // Create upload session if not provided
    let sessionId = uploadSessionId;
    if (!sessionId) {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('player_upload_history')
          .insert({
            team_id: this.teamId,
            filename: file?.name || 'Manual Upload',
            file_path: filePath,
            file_size: file?.size || 0,
            file_type: file?.type || 'text/csv',
            total_players: players.length,
            success_count: 0, // Will be updated after upload
            error_count: 0,   // Will be updated after upload
            details: { errors: [] }
          })
          .select()
          .single();

        if (sessionError) {
          console.warn('Upload history table not available, using fallback session ID:', sessionError.message);
          sessionId = `fallback-${Date.now()}`;
        } else {
          sessionId = sessionData.id;
        }
      } catch (error) {
        console.warn('Upload history table not available, using fallback session ID:', error);
        sessionId = `fallback-${Date.now()}`;
      }
    }

    // Import activity service
    const { PlayerActivityService } = await import('./playerActivityService');
    const activityService = new PlayerActivityService(this.teamId);

    for (const player of players) {
      try {
        const { data: playerData, error } = await supabase
          .from('players')
          .insert({
            team_id: this.teamId,
            ...player
          })
          .select()
          .single();

        if (error) {
          errors.push(`Failed to upload ${player.full_name}: ${error.message}`);
        } else {
          successCount++;
          uploadedPlayers.push(playerData);
          
          // Log player creation activity
          await activityService.logPlayerCreated(playerData, sessionId);
        }
      } catch (error) {
        errors.push(`Failed to upload ${player.full_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update upload session with final counts (if table exists)
    try {
      const { error: updateError } = await supabase
        .from('player_upload_history')
        .update({
          success_count: successCount,
          error_count: errors.length,
          details: { errors }
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating upload session:', updateError);
      } else {
        console.log('✅ Upload session updated successfully');
      }
    } catch (error) {
      console.warn('Could not update upload session (table may not exist):', error);
    }

    return { 
      success: successCount, 
      errors, 
      uploadedPlayers,
      uploadSessionId: sessionId
    };
  }

  /**
   * Generate CSV template for the current sport type
   */
  generateCSVTemplate(): string {
    const headers = this.getTemplateHeaders();
    const sampleData = this.getSampleData();
    
    const csvContent = [
      headers.join(','),
      sampleData.join(',')
    ].join('\n');

    return csvContent;
  }

  /**
   * Get template headers based on sport type
   */
  private getTemplateHeaders(): string[] {
    const baseHeaders = [
      'Name',
      'Position',
      'Jersey Number',
      'Age',
      'Height (cm)',
      'Weight (kg)',
      'Citizenship',
      'Gender',
      'Date of Birth (YYYY-MM-DD)',
      'Place of Birth',
      'Bio'
    ];

    // Add sport-specific headers
    if (this.sportType === 'football') {
      baseHeaders.splice(10, 0, 'Preferred Foot', 'FIFA ID');
    }

    // Add optional headers
    const optionalHeaders = [
      'Market Value',
      'Player Agent',
      'Current Club',
      'Joined Date (YYYY-MM-DD)',
      'Contract Expires (YYYY-MM-DD)'
    ];

    return [...baseHeaders, ...optionalHeaders];
  }

  /**
   * Get sample data for template
   */
  private getSampleData(): string[] {
    const sampleData = [
      'John Doe',
      this.getValidPositions()[0],
      '10',
      '25',
      '180',
      '75',
      'United States',
      'male',
      '1999-01-15',
      'New York, USA',
      'Experienced player with great potential'
    ];

    // Add sport-specific sample data
    if (this.sportType === 'football') {
      sampleData.splice(10, 0, 'right', '123456');
    }

    // Add optional sample data
    const optionalData = [
      '1000000',
      'Agent Name',
      'Current Club Name',
      '2023-01-01',
      '2025-12-31'
    ];

    return [...sampleData, ...optionalData];
  }

  /**
   * Download CSV template
   */
  downloadTemplate(): void {
    const csvContent = this.generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${this.sportType}_players_template.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
