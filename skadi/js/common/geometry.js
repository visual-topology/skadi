/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.Geometry = class {

    constructor() {
    }

    get_corner_points(x,y,corners,r,smoothing) {
        smoothing = 0.1;
        let points = this.compute_polygon_points(x,y,corners,r);
        if (!smoothing) {
            return this.compute_standard_path(points);
        } else {
            return this.compute_smoothed_path(points,smoothing);
        }
    }

    compute_polygon_points(x,y,corners,r) {
        let points = [];

        let step = (Math.PI*2)/corners;

        let theta = 0;
        let dist = r;
        if (corners == 3) {
            dist *= 1.4;
        }
        if (corners == 4) {
            dist *= 1.2;
            theta -= step/2;
        }

        for(let i=0; i<corners; i++) {
            let px = x+dist*Math.sin(theta);
            let py = y-dist*Math.cos(theta);
            theta += step;
            points.push([px,py]);
        }
        return points;
    }

    compute_smoothed_path(points,smoothing) {
        let s = '';
        let segments = [];
        for(let idx=0; idx<points.length;idx++) {
            let c = points[idx];
            let p = null;
            if (idx == 0) {
                s += "M ";
                s += c[0] + "," + c[1];
                p = points[points.length-1];
            } else {
                p = points[idx-1];
            }

            let f0 = smoothing;
            let f1 = 1.0 - smoothing;

            let p1x = c[0]*f0+p[0]*f1;
            let p1y = c[1]*f0+p[1]*f1;

            let p2x = c[0]*f1+p[0]*f0;
            let p2y = c[1]*f1+p[1]*f0;

            segments.push([p1x,p1y,p2x,p2y]);
        }

        for(let idx=0; idx<points.length;idx++) {
            let c = points[idx];
            let s0 = segments[idx];

            let s1 = segments[(idx+1) % segments.length];


            if (idx == 0) {
                s += " M " + s0[0] + "," + s0[1];
            }
            s += " L " + s0[2] + "," + s0[3];
            s += " Q " + c[0] + "," + c[1] + " " + s1[0]+","+s1[1];
        }
        s += " Z";
        return s;
    }

    compute_standard_path(points) {
        let sep = '';
        let s = '';
        let action = "M";
        for(let idx=0; idx<points.length; idx++) {
            s += action;
            let p = points[idx];
            let x = p[0];
            let y = p[1];
            s += sep;
            sep = ' ';
            s += x+" "+y;
            action = "L";
        }
        s += " Z";
        return s;
    }

    compute_sector_path(ox,oy,r1,r2,theta1,theta2) {
        let s = "M"+(ox+r2*Math.cos(theta1))+","+(oy+r2*Math.sin(theta1))+" ";
        let x = 0;
        if ((theta2-theta1) > Math.PI) {
            x = 1;
        }
        s += "A"+r2+","+r2+","+"0,"+x+",1,"+(ox+r2*Math.cos(theta2))+","+(oy+r2*Math.sin(theta2))+" ";
        s += "L"+(ox+r1*Math.cos(theta2))+","+(oy+r1*Math.sin(theta2))+" ";
        s += "A"+r1+","+r1+","+"0,"+x+",0,"+(ox+r1*Math.cos(theta1))+","+(oy+r1*Math.sin(theta1))+" ";
        s += "z";
        return s;
    }

    compute_triangle_path(cx,cy,angle,radius) {
        let ax1 = cx + radius*Math.cos(angle);
        let ay1 = cy + radius*Math.sin(angle);
        let ax2 = cx + radius*Math.cos(angle-Math.PI*2/3);
        let ay2 = cy + radius*Math.sin(angle-Math.PI*2/3);
        let ax3 = cx + radius*Math.cos(angle+Math.PI*2/3);
        let ay3 = cy + radius*Math.sin(angle+Math.PI*2/3);
        return "M"+ax1+","+ay1 + " L"+ax2+","+ay2+ " L"+ax3+","+ay3+" z";
    }
}